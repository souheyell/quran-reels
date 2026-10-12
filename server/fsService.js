import fs from 'fs';
import path from 'path';

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const CAPTION_EXTS = new Set(['.txt', '.json', '.caption', '.srt', '.vtt']);

/**
 * Normalizes and resolves a path relative to workspace or system.
 */
export function resolveSafePath(userPath, workspaceDir) {
  if (!userPath || userPath === '.' || userPath === '/') {
    return workspaceDir;
  }
  if (path.isAbsolute(userPath)) {
    return path.normalize(userPath);
  }
  return path.resolve(workspaceDir, userPath);
}

/**
 * Returns quick bookmarks for fast jumping.
 */
export function getBookmarks(workspaceDir) {
  const bookmarks = [
    { label: '🎬 Quran Reels Exports (./exports)', path: 'exports', icon: 'film' },
    { label: '☁️ Shared WIP (./shared_wip)', path: 'shared_wip', icon: 'cloud' },
    { label: '📁 Project Root (./)', path: '.', icon: 'folder' }
  ];

  return bookmarks;
}

/**
 * Formats a Date object into rich human-readable timestamp and date metadata.
 */
export function formatDateInfo(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  let timeAgo = 'Just now';
  if (diffSec >= 60 * 60 * 24 * 365) {
    const y = Math.floor(diffSec / (60 * 60 * 24 * 365));
    timeAgo = `${y}y ago`;
  } else if (diffSec >= 60 * 60 * 24 * 30) {
    const mo = Math.floor(diffSec / (60 * 60 * 24 * 30));
    timeAgo = `${mo}mo ago`;
  } else if (diffSec >= 60 * 60 * 24) {
    const days = Math.floor(diffSec / (60 * 60 * 24));
    timeAgo = `${days}d ago`;
  } else if (diffSec >= 60 * 60) {
    const h = Math.floor(diffSec / (60 * 60));
    timeAgo = `${h}h ago`;
  } else if (diffSec >= 60) {
    const m = Math.floor(diffSec / 60);
    timeAgo = `${m}m ago`;
  } else if (diffSec > 5) {
    timeAgo = `${diffSec}s ago`;
  }

  // Readable: "Oct 11, 2026 · 12:15 AM"
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Full day & date: "Sun, Oct 11, 2026"
  const fullDate = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Comprehensive date-time: "Sunday, October 11, 2026 at 12:15 AM"
  const fullDateTime = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    iso: d.toISOString(),
    formatted,
    fullDate,
    fullDateTime,
    timeAgo,
    timestamp: d.getTime(),
  };
}

/**
 * Extracts and formats embedded dates from folder or file names like:
 * quran_pack_kahf_20260909_0386 -> Sep 9, 2026
 * pack_20261011_143000 -> Oct 11, 2026
 */
export function parseNameDate(name) {
  if (!name) return null;
  const match = name.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;

  return {
    raw: match[0],
    formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    iso: d.toISOString().slice(0, 10),
  };
}

/**
 * Lists directories, archives, and media files in targetPath.
 */
export function listFiles(targetPath, workspaceDir) {
  const resolved = resolveSafePath(targetPath, workspaceDir);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${targetPath}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${targetPath}`);
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const directories = [];
  const files = [];

  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue; // ignore hidden files/folders

    const fullPath = path.join(resolved, ent.name);
    try {
      if (ent.isDirectory()) {
        const dstat = fs.statSync(fullPath);
        const dateInfo = formatDateInfo(dstat.mtime);
        const nameDate = parseNameDate(ent.name);

        const subFiles = fs.readdirSync(fullPath);
        const subVideos = subFiles.filter((f) => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
        const hasManifest = subFiles.some((f) => f.toLowerCase().includes('manifest') || f.toLowerCase().includes('metadata'));

        directories.push({
          name: ent.name,
          path: path.relative(workspaceDir, fullPath) || ent.name,
          absolutePath: fullPath,
          itemCount: subFiles.length,
          videoCount: subVideos.length,
          hasManifest,
          isPackFolder: subVideos.length > 0,
          updatedAt: dateInfo?.iso || null,
          updatedFormatted: dateInfo?.formatted || null,
          updatedFullDate: dateInfo?.fullDateTime || dateInfo?.fullDate || null,
          timeAgo: dateInfo?.timeAgo || null,
          mtimeMs: dateInfo?.timestamp || 0,
          batchDate: nameDate?.formatted || null,
          batchFullDate: nameDate?.fullDate || null,
        });
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        const fstat = fs.statSync(fullPath);
        const dateInfo = formatDateInfo(fstat.mtime);
        const isVideo = VIDEO_EXTS.has(ext);
        const isCaption = CAPTION_EXTS.has(ext);
        const isZip = ext === '.zip';
        const isManifest = ent.name.toLowerCase().includes('manifest') || ent.name.toLowerCase().includes('metadata');

        if (isVideo || isCaption || isZip) {
          files.push({
            name: ent.name,
            path: path.relative(workspaceDir, fullPath) || ent.name,
            absolutePath: fullPath,
            sizeBytes: fstat.size,
            sizeMb: Number((fstat.size / (1024 * 1024)).toFixed(2)),
            ext,
            isVideo,
            isCaption,
            isZip,
            isManifest,
            streamUrl: `/api/fs/stream?path=${encodeURIComponent(fullPath)}`,
            updatedAt: dateInfo?.iso || null,
            updatedFormatted: dateInfo?.formatted || null,
            updatedFullDate: dateInfo?.fullDateTime || dateInfo?.fullDate || null,
            timeAgo: dateInfo?.timeAgo || null,
            mtimeMs: dateInfo?.timestamp || 0,
          });
        }
      }
    } catch (_) {}
  }

  // Sort: packs first, and sorted by most recently updated descending
  directories.sort((a, b) => {
    if (a.isPackFolder !== b.isPackFolder) {
      return b.isPackFolder ? 1 : -1;
    }
    if (b.mtimeMs !== a.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }
    return a.name.localeCompare(b.name);
  });

  // Sort files: videos first, then by most recently updated descending
  files.sort((a, b) => {
    if (a.isVideo !== b.isVideo) {
      return b.isVideo ? 1 : -1;
    }
    if (b.mtimeMs !== a.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }
    return a.name.localeCompare(b.name);
  });

  const parentResolved = path.resolve(resolved, '..');
  const parentPath = path.relative(workspaceDir, parentResolved);

  return {
    currentPath: path.relative(workspaceDir, resolved) || '.',
    absolutePath: resolved,
    parentPath: parentPath || '..',
    canGoUp: resolved !== path.resolve('/'),
    directories,
    files,
    bookmarks: getBookmarks(workspaceDir),
  };
}

/**
 * Ingests a directory, zip archive, or file selection and prepares stream descriptors.
 */
export function ingestSelection(targetPath, selectedFiles, workspaceDir) {
  const resolved = resolveSafePath(targetPath, workspaceDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Target not found: ${targetPath}`);
  }

  const stat = fs.statSync(resolved);
  const items = [];

  const collectFile = (fullPath) => {
    const name = path.basename(fullPath);
    const ext = path.extname(name).toLowerCase();
    const fstat = fs.statSync(fullPath);
    items.push({
      name,
      fullPath,
      sizeBytes: fstat.size,
      sizeMb: Number((fstat.size / (1024 * 1024)).toFixed(2)),
      isVideo: VIDEO_EXTS.has(ext),
      isCaption: CAPTION_EXTS.has(ext),
      isZip: ext === '.zip',
      isManifest: name.toLowerCase().includes('manifest') || name.toLowerCase().includes('metadata'),
      streamUrl: `/api/fs/stream?path=${encodeURIComponent(fullPath)}`,
    });
  };

  if (stat.isDirectory()) {
    // If selectedFiles passed, use only those, otherwise collect all in folder
    if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      for (const sf of selectedFiles) {
        let fp;
        if (path.isAbsolute(sf)) {
          fp = sf;
        } else if (workspaceDir && fs.existsSync(path.resolve(workspaceDir, sf))) {
          fp = path.resolve(workspaceDir, sf);
        } else {
          fp = path.join(resolved, sf);
        }

        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
          collectFile(fp);
        }
      }
    } else {
      const dirEntries = fs.readdirSync(resolved);
      for (const ent of dirEntries) {
        if (ent.startsWith('.')) continue;
        const fp = path.join(resolved, ent);
        if (fs.statSync(fp).isFile()) {
          collectFile(fp);
        }
      }
    }
  } else if (stat.isFile()) {
    collectFile(resolved);
  }

  let manifestData = null;
  const manifestItem = items.find((i) => i.isManifest);
  if (manifestItem && fs.existsSync(manifestItem.fullPath)) {
    try {
      const raw = fs.readFileSync(manifestItem.fullPath, 'utf8');
      manifestData = JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse manifest JSON:', e);
    }
  }

  return {
    success: true,
    targetPath,
    itemCount: items.length,
    videoCount: items.filter((i) => i.isVideo).length,
    items,
    manifestData,
  };
}

/**
 * Handles HTTP Range requests for smooth video streaming and asset delivery.
 */
export function handleFileStream(filePath, req, res) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'application/octet-stream';
  if (VIDEO_EXTS.has(ext)) contentType = 'video/mp4';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.txt' || ext === '.caption' || ext === '.srt') contentType = 'text/plain; charset=utf-8';
  else if (ext === '.zip') contentType = 'application/zip';

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
