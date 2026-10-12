#!/usr/bin/env node
/**
 * Cloud Bridge Server for ReelsBulkQuran
 * Runs in GitHub Codespaces (Azure Datacenter) to execute 1 Gbps direct uploads to Meta & TikTok.
 * Bypasses weak home internet completely.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listFiles, ingestSelection, handleFileStream, formatDateInfo, parseNameDate } from './fsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;
const WORKSPACE_DIR = path.resolve(__dirname, '..');
const SHARED_WIP_DIR = path.resolve(WORKSPACE_DIR, 'shared_wip');
const EXPORTS_DIR = path.resolve(WORKSPACE_DIR, 'exports');

// Ensure shared directories exist
for (const dir of [SHARED_WIP_DIR, EXPORTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 0. Filesystem Explorer Routes (/api/fs/*)
  if (url.pathname === '/api/fs/list' && req.method === 'GET') {
    const targetPath = url.searchParams.get('path') || 'exports';
    try {
      const data = listFiles(targetPath, WORKSPACE_DIR);
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (url.pathname === '/api/fs/ingest' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { targetPath, selectedFiles } = JSON.parse(body || '{}');
        const data = ingestSelection(targetPath, selectedFiles, WORKSPACE_DIR);
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  if (url.pathname === '/api/fs/stream' && req.method === 'GET') {
    const rawPath = url.searchParams.get('path');
    if (!rawPath) return sendJson(res, 400, { error: 'Missing path' });
    handleFileStream(rawPath, req, res);
    return;
  }

  // 1. Health & Cloud Status
  if (req.method === 'GET' && url.pathname === '/api/status') {
    return sendJson(res, 200, {
      status: 'online',
      isCloudBridge: true,
      network: '1 Gbps Datacenter Link',
      sharedWipPath: SHARED_WIP_DIR,
      exportsPath: EXPORTS_DIR,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  // 1b. Discovered Export Packs (./exports/pack_YYYYMMDD_HHMMSS/)
  if (req.method === 'GET' && url.pathname === '/api/export-packs') {
    try {
      const packs = [];
      if (fs.existsSync(EXPORTS_DIR)) {
        const entries = fs.readdirSync(EXPORTS_DIR, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory() || ent.name.endsWith('.zip')) {
            const packPath = path.join(EXPORTS_DIR, ent.name);
            const stat = fs.statSync(packPath);
            const dateInfo = formatDateInfo(stat.mtime);
            const nameDate = parseNameDate(ent.name);
            const files = ent.isDirectory() ? fs.readdirSync(packPath) : [];
            const videos = files.filter((f) => Boolean(f.match(/\.(mp4|mov|m4v|webm)$/i)));
            const hasManifest = files.includes('manifest.json') || files.includes('metadata.json');
            packs.push({
              name: ent.name,
              folderPath: path.relative(WORKSPACE_DIR, packPath),
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
            });
          }
        }
      }
      // Sort newest-updated first
      packs.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return sendJson(res, 200, { success: true, count: packs.length, packs });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. Scan shared_wip or specific exports/pack directory for ready files
  if (req.method === 'GET' && url.pathname === '/api/wip-files') {
    try {
      const customFolder = url.searchParams.get('folder');
      const targetDir = customFolder 
        ? path.resolve(WORKSPACE_DIR, customFolder) 
        : (fs.existsSync(EXPORTS_DIR) && fs.readdirSync(EXPORTS_DIR).length > 0 ? EXPORTS_DIR : SHARED_WIP_DIR);

      if (!fs.existsSync(targetDir)) {
        return sendJson(res, 404, { success: false, error: `Directory not found: ${targetDir}` });
      }

      // Collect files from targetDir (and if targetDir is EXPORTS_DIR, check child pack folders)
      let filesToScan = [];
      const stats = fs.statSync(targetDir);
      if (stats.isDirectory()) {
        const entries = fs.readdirSync(targetDir);
        for (const entry of entries) {
          const entryPath = path.join(targetDir, entry);
          const entryStat = fs.statSync(entryPath);
          if (entryStat.isDirectory()) {
            // Include files inside sub-pack
            const subFiles = fs.readdirSync(entryPath);
            for (const sf of subFiles) {
              filesToScan.push({ name: sf, fullPath: path.join(entryPath, sf), subfolder: entry });
            }
          } else {
            filesToScan.push({ name: entry, fullPath: entryPath });
          }
        }
      }

      const items = filesToScan.map(({ name, fullPath, subfolder }) => {
        const fileStat = fs.statSync(fullPath);
        const dateInfo = formatDateInfo(fileStat.mtime);
        return {
          name,
          subfolder,
          path: fullPath,
          sizeBytes: fileStat.size,
          sizeMb: Number((fileStat.size / (1024 * 1024)).toFixed(2)),
          isVideo: Boolean(name.match(/\.(mp4|mov|m4v|webm)$/i)),
          isCaption: Boolean(name.match(/\.(txt|json|caption|srt)$/i)),
          isManifest: Boolean(name.match(/^(manifest|metadata|captions)\.json$/i)),
          streamUrl: `http://localhost:3001/api/wip-file-stream?path=${encodeURIComponent(fullPath)}`,
          updatedAt: dateInfo?.iso || null,
          updatedFormatted: dateInfo?.formatted || null,
          updatedFullDate: dateInfo?.fullDateTime || dateInfo?.fullDate || null,
          timeAgo: dateInfo?.timeAgo || null,
          mtimeMs: dateInfo?.timestamp || 0,
        };
      });
      // Sort newest files first
      items.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return sendJson(res, 200, { success: true, count: items.length, items });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2b. Stream specific file from disk
  if (req.method === 'GET' && url.pathname === '/api/wip-file-stream') {
    const rawPath = url.searchParams.get('path') || url.searchParams.get('name');
    if (!rawPath) return sendJson(res, 400, { error: 'Missing path' });
    const targetPath = path.isAbsolute(rawPath) ? rawPath : path.join(WORKSPACE_DIR, rawPath);
    
    // Safety check: must stay within WORKSPACE_DIR
    if (!targetPath.startsWith(WORKSPACE_DIR) || !fs.existsSync(targetPath)) {
      return sendJson(res, 404, { error: 'File not found' });
    }

    const stat = fs.statSync(targetPath);
    let mime = 'text/plain';
    if (targetPath.match(/\.(mp4|mov|m4v|webm)$/i)) mime = 'video/mp4';
    else if (targetPath.endsWith('.json')) mime = 'application/json';
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  // 3. Direct 1 Gbps Cloud Upload to Meta Graph API
  if (req.method === 'POST' && url.pathname === '/api/cloud-upload') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const {
          fileName,
          filePath,
          pageId,
          pageAccessToken,
          title,
          caption,
          scheduledPublishTime
        } = payload;

        if (!pageId || !pageAccessToken) {
          return sendJson(res, 400, { success: false, error: 'Missing pageId or pageAccessToken' });
        }

        // Locate file on cloud SSD
        const targetPath = filePath || path.join(SHARED_WIP_DIR, fileName);
        if (!fs.existsSync(targetPath)) {
          return sendJson(res, 404, { success: false, error: `File not found on cloud disk: ${targetPath}` });
        }

        const fileStats = fs.statSync(targetPath);
        const fileBuffer = fs.readFileSync(targetPath);

        console.log(`[CloudBridge] Initiating Meta upload for ${path.basename(targetPath)} (${(fileStats.size / 1024 / 1024).toFixed(1)} MB)...`);

        // Step 1: Start Video Reel Session
        const startUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/video_reels`;
        const startRes = await fetch(startUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_phase: 'start',
            access_token: pageAccessToken,
          }),
        });

        if (!startRes.ok) {
          const errData = await startRes.json().catch(() => ({}));
          console.error('[CloudBridge] Meta start phase failed:', errData);
          return sendJson(res, 400, { success: false, error: errData?.error?.message || 'Meta start phase failed' });
        }

        const startData = await startRes.json();
        const videoId = startData.video_id;
        const uploadUrl = startData.upload_url;

        // Step 2: Stream binary over Azure Datacenter 1 Gbps Link
        console.log(`[CloudBridge] Streaming binary at datacenter speed to Meta ruploader...`);
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `OAuth ${pageAccessToken}`,
            offset: '0',
            file_size: String(fileStats.size),
          },
          body: fileBuffer,
        });

        if (!uploadRes.ok) {
          const upErr = await uploadRes.json().catch(() => ({}));
          return sendJson(res, 400, { success: false, error: upErr?.error?.message || 'Binary upload failed' });
        }

        // Step 3: Finish and Schedule in Meta Cloud
        const finishParams = {
          upload_phase: 'finish',
          access_token: pageAccessToken,
          video_id: videoId,
          video_state: scheduledPublishTime ? 'SCHEDULED' : 'PUBLISHED',
          title: title || 'Quran Reel',
          description: caption || '',
        };

        if (scheduledPublishTime) {
          finishParams.scheduled_publish_time = scheduledPublishTime;
        }

        console.log(`[CloudBridge] Finalizing reel (state: ${finishParams.video_state}, time: ${scheduledPublishTime || 'now'})...`);
        const finishRes = await fetch(startUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finishParams),
        });

        if (!finishRes.ok) {
          const finErr = await finishRes.json().catch(() => ({}));
          return sendJson(res, 400, { success: false, error: finErr?.error?.message || 'Failed to finalize Reel' });
        }

        console.log(`[CloudBridge] ✅ Successfully pre-scheduled Reel ${videoId} on Meta Cloud!`);
        return sendJson(res, 200, {
          success: true,
          videoId,
          scheduledPublishTime,
          isUploadedToCloud: true,
          cloudUploadSpeed: 'Datacenter Gigabit',
        });
      } catch (err) {
        console.error('[CloudBridge] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // Fallback 404
  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Quran Reels Cloud Bridge running on port ${PORT}`);
  console.log(`📁 Shared Cloud WIP Directory: ${SHARED_WIP_DIR}`);
});
