// Vice Cover Studio — submission entrypoint.
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// vendored makefun-app.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output (the kit's documented convention).
//
// Usage:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The run must be byte-identical across runs and must not write into the
// repository, so a read-only checkout still works.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Caps from the competition rules: the dossier text holds at most
// 160 KiB of source, the entry hands in 3–4 screenshots, the site
// publishes at most 993 files / 48 MiB with paths under 240 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 4 * 1024 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 240,
};

function copyTree(name: string): void {
  const src = join(REPO_ROOT, name);
  if (!existsSync(src)) {
    throw new Error(`main.ts: ${name}/ is missing from the repository`);
  }
  cpSync(src, join(OUT_DIR, name), { recursive: true });
}

function main(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  copyTree('app');
  copyTree('screenshots');
  const dossier = buildDossier(OUT_DIR, CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  console.log(`main.ts: wrote ${join(OUT_DIR, 'dossier.json')} (${dossier.length} bytes)`);
}

main();
