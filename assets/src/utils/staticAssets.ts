import { extname, resolve, sep } from 'path';
import { lstatSync } from 'fs';

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

    let currentPath = safeRoot;
    let filePath = safeRoot;
    for (const segment of relativePathParts) {
      filePath = resolve(currentPath, segment);
      currentPath = filePath;

      try {
        if (lstatSync(filePath).isSymbolicLink()) {
          return new Response('Not Found', { status: 404 });
        }
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    }

    filePath = resolve(assetsRoot, ...relativePathParts);
    if (!filePath.startsWith(`${safeRoot}${sep}`) && filePath !== safeRoot) {
      return new Response('Not Found', { status: 404 });
    }

    const file = Bun.file(filePath);
    let isFile = false;

    try {
      const stats = await file.stat();
      isFile = stats.isFile();
    } catch {
      return new Response('Not Found', { status: 404 });
    }

    if (!isFile) {
      return new Response('Not Found', { status: 404 });
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(file.stream(), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size),
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes',
      },
    });
  };
};

export default staticAssets;
