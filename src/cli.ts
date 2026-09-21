#!/usr/bin/env bun
// company-brain CLI.
//   bun src/cli.ts lint <brain-dir> [--format text|json|github] [--json]
//                                              check a brain before gbrain sync
//   bun src/cli.ts pack-path                   print the schema pack location

import { realpathSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { FORMATS, format, type Format } from './format.ts';
import { lintBrain } from './lint.ts';
import { PACK_PATH } from './pack.ts';

const USAGE = 'Usage: bun src/cli.ts lint <brain-dir> [--format text|json|github] | pack-path';
const [command, ...rest] = Bun.argv.slice(2);

const args: string[] = [];
let fmt: Format = 'text';
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === '--json') fmt = 'json';
  else if (a === '--format' || a.startsWith('--format=')) {
    const value = a.includes('=') ? a.split('=')[1] : rest[++i];
    if (!FORMATS.includes(value as Format)) {
      console.error(`Unknown format "${value}". Use one of: ${FORMATS.join(', ')}`);
      process.exit(2);
    }
    fmt = value as Format;
  } else if (!a.startsWith('--')) args.push(a);
}

if (command === 'pack-path') {
  console.log(PACK_PATH);
} else if (command === 'lint' && args[0]) {
  const root = resolve(args[0]);
  const report = lintBrain(root);
  // Annotations need paths relative to the repository root, which is the
  // working directory inside a GitHub Actions job.
  // realpath both sides, so a symlinked workspace or temp dir cannot defeat the prefix.
  const prefix = relative(realpathSync(process.env.GITHUB_WORKSPACE ?? process.cwd()), realpathSync(root));
  console.log(format(report, fmt, prefix.startsWith('..') ? '' : prefix));
  process.exit(report.errors > 0 ? 1 : 0);
} else {
  console.log(USAGE);
  process.exit(command ? 2 : 0);
}
