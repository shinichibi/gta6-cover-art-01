// main.ts — hands the VICE FRAME entry in.
//
// The scorer expects the app and its screenshots side by side in /output,
// plus a dossier.json describing them. This program copies app/ and
// screenshots/ out of the repository and asks the vendored make.fun
// library to write that dossier with the bounty's own caps, so the bytes
// here are exactly the bytes the scorer would produce itself.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = '/output';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`VICE FRAME handed in: /output/dossier.json written (${dossier.length} bytes).`);
