#!/usr/bin/env bun
// company-brain CLI.
//   bun src/cli.ts lint <brain-dir> [--json]   check a brain before gbrain sync
//   bun src/cli.ts pack-path                   print the schema pack location

import { resolve } from 'node:path';
import { lintBrain } from './lint.ts';
import { PACK_PATH } from './pack.ts';

const [command, ...rest] = Bun.argv.slice(2);
const json = rest.includes('--json');
const args = rest.filter((a) => !a.startsWith('--'));

if (command === 'pack-path') {
  console.log(PACK_PATH);
} else if (command === 'lint' && args[0]) {
  const report = lintBrain(resolve(args[0]));
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const f of report.findings) {
      console.log(`${f.severity === 'error' ? 'x' : '!'} ${f.code.padEnd(18)} ${f.file}  ${f.message}`);
    }
    console.log(`\n${report.pages} pages, ${report.errors} errors, ${report.warnings} warnings`);
  }
  process.exit(report.errors > 0 ? 1 : 0);
} else {
  console.log('Usage: bun src/cli.ts lint <brain-dir> [--json] | pack-path');
  process.exit(command ? 2 : 0);
}
