// San Vero Streets entry point (Node 22, standard library only).
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts   copy game/ + screenshots/ there, write dossier.json
//   node main.ts --port 8143              serve game/ at http://localhost:8143
//   MAKEFUN_OUTPUT_DIR=out node main.ts --port 8143       both at once
//
// MAKEFUN_OUTPUT_DIR stands in for the grader's /output, which is the default target. On an
// ordinary machine /output is not writable, so without the variable only --port mode can run.

import { accessSync, constants, cpSync, createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const GAME_DIR = join(here, 'game');
const SHOTS_DIR = join(here, 'screenshots');

// The scorer's caps (reference/gate.json): text_max_bytes shapes the dossier's bytes, the rest
// only refuse an entry the scorer would refuse anyway.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** The --port value the command line asks for, or null when it does not; exits on a bad value. */
function requestedPort(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const given = arg.startsWith('--port=') ? arg.slice(7) : arg === '--port' ? argv[i + 1] : null;
    if (given === null) continue;
    const port = Number(given);
    if (!Number.isInteger(port) || port <= 0 || port >= 65536) {
      console.error(`main.ts: --port needs a number from 1 to 65535, not ${JSON.stringify(given)}`);
      process.exit(2);
    }
    return port;
  }
  return null;
}

/** Whether a directory exists (or can be made) and is writable, making it ready to receive the entry. */
function outputReady(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Copy game/ and screenshots/ into an output directory and write its dossier.json; returns the dossier's size. */
function emitEntry(outDir: string): number {
  mkdirSync(outDir, { recursive: true });
  cpSync(GAME_DIR, join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(SHOTS_DIR)) cpSync(SHOTS_DIR, join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, GATE);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  return dossier.length;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

/** Serve game/ as static files on 127.0.0.1:port; stays up until the process is killed. */
function serveGame(port: number): void {
  const root = resolve(GAME_DIR);
  const server = createServer((request, response) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('bad request');
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(root, normalize(pathname)));
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    let size: number;
    try {
      const stats = statSync(file);
      if (!stats.isFile()) throw new Error('not a file');
      size = stats.size;
    } catch {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': size,
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
  server.on('error', (err) => {
    console.error(`main.ts: cannot serve on port ${port} (${(err as Error).message})`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`serving game/ at http://localhost:${port} (Ctrl+C to stop)`);
  });
}

// ---------------------------------------------------------------- main

const port = requestedPort(process.argv.slice(2));
const envOut = process.env.MAKEFUN_OUTPUT_DIR;
const outDir = envOut ?? '/output';

if (envOut !== undefined || outputReady(outDir)) {
  const bytes = emitEntry(outDir);
  console.log(`dossier: game/ + screenshots/ copied to ${outDir}, dossier.json written (${bytes} bytes)`);
} else if (port === null) {
  console.error('main.ts: nothing to do: set MAKEFUN_OUTPUT_DIR to emit the entry, or pass --port N to serve game/');
  process.exit(1);
} else {
  console.error(`main.ts: ${outDir} is not writable here, serving only`);
}

if (port !== null) serveGame(port);
