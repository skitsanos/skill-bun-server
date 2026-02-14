import { extname, resolve, sep } from 'path';
import { lstat } from 'fs/promises';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
};

export interface StaticAssetsConfig {
  assetsPath?: string;
  urlPrefix?: string;
  cacheControl?: string;
}

const staticAssets = ({
  assetsPath = 'public/assets',
  urlPrefix = '/assets',
  cacheControl = 'public, max-age=31536000, immutable',
}: StaticAssetsConfig = {}) => {
  const assetsRoot = resolve(process.cwd(), assetsPath);
  const normalizedPrefix = urlPrefix.endsWith('/') ? urlPrefix.slice(0, -1) : urlPrefix;
  const safeRoot = resolve(assetsRoot).replace(/[\\/]+$/, '');

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (!url.pathname.startsWith(`${normalizedPrefix}/`) || url.pathname === normalizedPrefix) {
      return new Response('Not Found', { status: 404 });
    }

    const rawSegments = url.pathname
      .slice(normalizedPrefix.length + 1)
      .split('/')
      .filter(Boolean);

    const relativePathParts: string[] = [];
    for (const segment of rawSegments) {
      try {
        const decoded = decodeURIComponent(segment);
        if (decoded === '..' || decoded === '.' || decoded.includes('/') || decoded.includes('\\')) {
          return new Response('Not Found', { status: 404 });
        }

        relativePathParts.push(decoded);
      } catch {
        return new Response('Bad Request', { status: 400 });
      }
    }

    if (relativePathParts.length === 0) {
      return new Response('Not Found', { status: 404 });
    }

    // Resolve and validate each segment to prevent symlink traversal
    let currentPath = safeRoot;
    for (const segment of relativePathParts) {
      currentPath = resolve(currentPath, segment);

      try {
        const stats = await lstat(currentPath);
        if (stats.isSymbolicLink()) {
          return new Response('Not Found', { status: 404 });
        }
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    }

    const filePath = currentPath;
    if (!filePath.startsWith(`${safeRoot}${sep}`) && filePath !== safeRoot) {
      return new Response('Not Found', { status: 404 });
    }

    const file = Bun.file(filePath);
    let fileSize: number;

    try {
      const stats = await file.stat();
      if (!stats.isFile()) {
        return new Response('Not Found', { status: 404 });
      }
      fileSize = stats.size;
    } catch {
      return new Response('Not Found', { status: 404 });
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(file.stream(), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes',
      },
    });
  };
};

export default staticAssets;
