import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { listFiles, ingestSelection, handleFileStream, formatDateInfo, parseNameDate } from './server/fsService.js'

function localMediaPlugin(): Plugin {
  const backgroundsDir = path.resolve(process.cwd(), 'public/backgrounds')
  const imagesDir = path.join(backgroundsDir, 'images')
  const videosDir = path.join(backgroundsDir, 'videos')

  function scanMedia() {
    const images: Array<{
      id: string
      title: string
      filename: string
      url: string
      sizeLabel: string
      mediaType: 'image'
    }> = []
    const videos: Array<{
      id: string
      title: string
      filename: string
      url: string
      sizeLabel: string
      mediaType: 'video'
    }> = []

    const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg'])
    const videoExts = new Set(['.mp4', '.webm', '.mov', '.m4v'])

    function formatSize(bytes: number) {
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      return `${Math.round(bytes / 1024)} KB`
    }

    function cleanTitle(filename: string) {
      return path.parse(filename).name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir)
      for (const file of files) {
        if (file.startsWith('.') || file.endsWith('.txt') || file.endsWith('.md')) continue
        const ext = path.extname(file).toLowerCase()
        if (imageExts.has(ext)) {
          const stat = fs.statSync(path.join(imagesDir, file))
          images.push({
            id: `local-img-${file}`,
            title: cleanTitle(file),
            filename: file,
            url: `/backgrounds/images/${file}`,
            sizeLabel: formatSize(stat.size),
            mediaType: 'image',
          })
        }
      }
    }

    if (fs.existsSync(videosDir)) {
      const files = fs.readdirSync(videosDir)
      for (const file of files) {
        if (file.startsWith('.') || file.endsWith('.txt') || file.endsWith('.md')) continue
        const ext = path.extname(file).toLowerCase()
        if (videoExts.has(ext)) {
          const stat = fs.statSync(path.join(videosDir, file))
          videos.push({
            id: `local-vid-${file}`,
            title: cleanTitle(file),
            filename: file,
            url: `/backgrounds/videos/${file}`,
            sizeLabel: formatSize(stat.size),
            mediaType: 'video',
          })
        }
      }
    }

    return { images, videos, folderPath: backgroundsDir }
  }

  function updateManifest() {
    try {
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
      if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true })
      const data = scanMedia()
      fs.writeFileSync(path.join(backgroundsDir, 'manifest.json'), JSON.stringify(data, null, 2))
    } catch {
      // ignore
    }
  }

  return {
    name: 'local-media-manager',
    buildStart() {
      updateManifest()
    },
    configureServer(server) {
      updateManifest()

      // Endpoint: GET /__api/local-media
      server.middlewares.use('/__api/local-media', (req, res, next) => {
        if (req.method === 'GET') {
          const data = scanMedia()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
          return
        }
        next()
      })

      // Endpoint: POST /__api/open-folder
      server.middlewares.use('/__api/open-folder', (req, res, next) => {
        if (req.method === 'POST') {
          exec(`open "${backgroundsDir}"`, (err) => {
            res.setHeader('Content-Type', 'application/json')
            if (err) {
              res.end(JSON.stringify({ success: false, error: err.message, folderPath: backgroundsDir }))
            } else {
              res.end(JSON.stringify({ success: true, folderPath: backgroundsDir }))
            }
          })
          return
        }
        next()
      })

      // Endpoint: POST /__api/upload-media
      server.middlewares.use('/__api/upload-media', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => {
            try {
              const rawFilename = (req.headers['x-filename'] as string) || `media_${Date.now()}`
              const filename = decodeURIComponent(rawFilename)
              const isVideo =
                (req.headers['x-media-type'] as string) === 'video' ||
                /\.(mp4|webm|mov|m4v)$/i.test(filename)
              const targetDir = isVideo ? videosDir : imagesDir
              const buffer = Buffer.concat(chunks)
              const filePath = path.join(targetDir, filename)
              fs.writeFileSync(filePath, buffer)
              updateManifest()
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  url: `/backgrounds/${isVideo ? 'videos' : 'images'}/${filename}`,
                  filename,
                  mediaType: isVideo ? 'video' : 'image',
                }),
              )
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Upload failed'
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: message }))
            }
          })
          return
        }
        next()
      })

      // ── Exports Destination Endpoints (Cloudspace & Local Disk) ──
      const exportsDir = path.resolve(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      // Endpoint: GET /__api/export-config
      server.middlewares.use('/__api/export-config', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ exportsDir, relativeDir: 'exports' }))
          return
        }
        next()
      })

      // Endpoint: POST /__api/save-single-export
      server.middlewares.use('/__api/save-single-export', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => {
            try {
              const singleDir = path.join(exportsDir, 'single')
              if (!fs.existsSync(singleDir)) fs.mkdirSync(singleDir, { recursive: true })
              const rawFilename = (req.headers['x-filename'] as string) || `reel_${Date.now()}.mp4`
              const filename = decodeURIComponent(rawFilename)
              const filePath = path.join(singleDir, filename)
              const buffer = Buffer.concat(chunks)
              fs.writeFileSync(filePath, buffer)
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  folderPath: singleDir,
                  filePath,
                  filename,
                  exportsDir,
                }),
              )
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Save single export failed'
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: message }))
            }
          })
          return
        }
        next()
      })

      // Endpoint: POST /__api/save-bulk-file
      server.middlewares.use('/__api/save-bulk-file', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => {
            try {
              const rawPackName = (req.headers['x-pack-name'] as string) || `quran_reels_pack_${Date.now()}`
              const packName = decodeURIComponent(rawPackName)
              const packDir = path.join(exportsDir, packName)
              if (!fs.existsSync(packDir)) fs.mkdirSync(packDir, { recursive: true })

              const rawFilename = (req.headers['x-filename'] as string) || `video_${Date.now()}.mp4`
              const filename = decodeURIComponent(rawFilename)
              const filePath = path.join(packDir, filename)
              const buffer = Buffer.concat(chunks)
              fs.writeFileSync(filePath, buffer)

              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  packName,
                  folderPath: packDir,
                  filePath,
                  filename,
                  manifestPath: path.join(packDir, 'manifest.json'),
                  exportsDir,
                }),
              )
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Save bulk file failed'
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: message }))
            }
          })
          return
        }
        next()
      })

      // Endpoint: POST /__api/save-file-chunk (Resilient chunked uploader for large MP4s and cloud proxies)
      server.middlewares.use('/__api/save-file-chunk', (req, res, next) => {
        if (req.method === 'POST') {
          const rawPackName = (req.headers['x-pack-name'] as string) || ''
          const rawSubFolder = (req.headers['x-subfolder'] as string) || ''
          const packName = rawPackName ? decodeURIComponent(rawPackName) : ''
          const subFolder = rawSubFolder ? decodeURIComponent(rawSubFolder) : ''

          let targetDir = exportsDir
          if (packName) {
            targetDir = path.join(exportsDir, packName)
          } else if (subFolder) {
            targetDir = path.join(exportsDir, subFolder)
          }

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }

          const rawFilename = (req.headers['x-filename'] as string) || `file_${Date.now()}`
          const filename = decodeURIComponent(rawFilename)
          const filePath = path.join(targetDir, filename)

          const chunkIndex = parseInt((req.headers['x-chunk-index'] as string) || '0', 10)
          const totalChunks = parseInt((req.headers['x-total-chunks'] as string) || '1', 10)
          const offset = parseInt((req.headers['x-chunk-offset'] as string) || '0', 10)
          const totalSize = parseInt((req.headers['x-total-size'] as string) || '0', 10)

          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks)

              // Open file for writing at exact offset
              const fd = fs.openSync(filePath, chunkIndex === 0 ? 'w' : (fs.existsSync(filePath) ? 'r+' : 'w'))
              fs.writeSync(fd, buffer, 0, buffer.length, offset)
              fs.closeSync(fd)

              const isLastChunk = chunkIndex >= totalChunks - 1
              const currentSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  chunkIndex,
                  totalChunks,
                  isLastChunk,
                  currentSize,
                  totalSize,
                  folderPath: targetDir,
                  filePath,
                  filename,
                  manifestPath: packName ? path.join(targetDir, 'manifest.json') : undefined,
                  exportsDir,
                }),
              )
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Save file chunk failed'
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: message }))
            }
          })
          return
        }
        next()
      })


      // Endpoint: POST /__api/open-export-folder
      server.middlewares.use('/__api/open-export-folder', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => {
            try {
              let targetDir = exportsDir
              if (chunks.length > 0) {
                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                if (parsed.folderPath && fs.existsSync(parsed.folderPath)) {
                  targetDir = parsed.folderPath
                }
              }
              const cmd = process.platform === 'darwin' ? `open "${targetDir}"` : process.platform === 'win32' ? `explorer "${targetDir}"` : `xdg-open "${targetDir}"`
              exec(cmd, (err) => {
                res.setHeader('Content-Type', 'application/json')
                if (err) {
                  res.end(JSON.stringify({ success: false, error: err.message, folderPath: targetDir }))
                } else {
                  res.end(JSON.stringify({ success: true, folderPath: targetDir }))
                }
              })
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Open folder failed'
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: message, folderPath: exportsDir }))
            }
          })
          return
        }
        next()
      })

      // ── Bulk Publisher Filesystem & Ingestion APIs (/api/fs/*) ──
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/fs')) return next()

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const workspaceDir = process.cwd()

        if (req.method === 'GET' && url.pathname === '/api/fs/list') {
          const targetPath = url.searchParams.get('path') || 'exports'
          try {
            const data = listFiles(targetPath, workspaceDir)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify(data))
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to list files'
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ error: message }))
          }
          return
        }

        if (req.method === 'POST' && url.pathname === '/api/fs/ingest') {
          let body = ''
          req.on('data', (c) => { body += c })
          req.on('end', () => {
            try {
              const { targetPath, selectedFiles } = JSON.parse(body || '{}')
              const data = ingestSelection(targetPath, selectedFiles, workspaceDir)
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify(data))
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Ingestion failed'
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify({ error: message }))
            }
          })
          return
        }

        if (req.method === 'GET' && url.pathname === '/api/fs/stream') {
          const rawPath = url.searchParams.get('path')
          if (!rawPath) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Missing path parameter' }))
            return
          }
          handleFileStream(rawPath, req, res)
          return
        }

        next()
      })

      // ── Bulk Publisher Export Packs Discovery (/api/export-packs) ──
      server.middlewares.use('/api/export-packs', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const packs = []
            if (fs.existsSync(exportsDir)) {
              const entries = fs.readdirSync(exportsDir, { withFileTypes: true })
              for (const ent of entries) {
                if (ent.isDirectory() || ent.name.endsWith('.zip')) {
                  const packPath = path.join(exportsDir, ent.name)
                  const stat = fs.statSync(packPath)
                  const dateInfo = formatDateInfo(stat.mtime)
                  const nameDate = parseNameDate(ent.name)
                  const files = ent.isDirectory() ? fs.readdirSync(packPath) : []
                  const videos = files.filter((f) => Boolean(f.match(/\.(mp4|mov|m4v|webm)$/i)))
                  const hasManifest = files.includes('manifest.json') || files.includes('metadata.json')
                  packs.push({
                    name: ent.name,
                    folderPath: path.relative(process.cwd(), packPath),
                    absolutePath: packPath,
                    isZip: ent.name.endsWith('.zip'),
                    videoCount: videos.length,
                    hasManifest,
                    videos,
                    updatedAt: dateInfo?.iso || null,
                    updatedFormatted: dateInfo?.formatted || null,
                    updatedFullDate: dateInfo?.fullDateTime || dateInfo?.fullDate || null,
                    timeAgo: dateInfo?.timeAgo || null,
                    mtimeMs: dateInfo?.timestamp || 0,
                    batchDate: nameDate?.formatted || null,
                    batchFullDate: nameDate?.fullDate || null,
                  })
                }
              }
            }
            // Sort newest-updated first
            packs.sort((a, b) => b.mtimeMs - a.mtimeMs)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ success: true, count: packs.length, packs }))
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to scan packs'
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ success: false, error: message }))
          }
          return
        }
        next()
      })

      // ── Bulk Publisher Engine Status (/api/status) ──
      server.middlewares.use('/api/status', (req, res, next) => {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({
            status: 'online',
            isCloudBridge: true,
            network: 'Unified Studio Pipeline',
            exportsPath: exportsDir,
            uptimeSeconds: Math.floor(process.uptime()),
          }))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localMediaPlugin()],
  server: {
    allowedHosts: ['.monkeycode-ai.live'],
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/api-meta-graph': {
        target: 'https://graph.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meta-graph/, ''),
        secure: true,
      },
      '/api-meta-rupload': {
        target: 'https://rupload.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meta-rupload/, ''),
        secure: true,
      },
      '/api/audio': {
        target: 'https://everyayah.com/data',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/audio/, ''),
        secure: true,
      },
      '/quran-audio': {
        target: 'https://cdn.islamic.network/quran/audio',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/quran-audio/, ''),
      },
    },
  },
})
