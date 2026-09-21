import { describe, expect, test } from 'bun:test';
import { format, formatGithub, formatText } from '../src/format.ts';
import type { LintReport } from '../src/lint.ts';

const report: LintReport = {
  pages: 3,
  errors: 1,
  warnings: 1,
  findings: [
    { code: 'LINK_DANGLING', severity: 'error', file: 'customers/acme.md', message: 'Wikilink [[people/ghost]] has no page' },
    { code: 'FM_MISSING', severity: 'warning', file: 'FACTSHEET.md', message: 'No readable frontmatter: 100% untyped,\nsecond line' },
  ],
} as LintReport;

describe('lint output formats', () => {
  test('text lists every finding and ends with the summary', () => {
    const out = formatText(report);
    expect(out).toContain('x LINK_DANGLING');
    expect(out).toContain('! FM_MISSING');
    expect(out.trimEnd().endsWith('3 pages, 1 errors, 1 warnings')).toBe(true);
  });

  test('github emits one workflow command per finding, with severity and title', () => {
    const lines = formatGithub(report).split('\n');
    expect(lines[0]).toBe(
      '::error file=customers/acme.md,title=LINK_DANGLING::Wikilink [[people/ghost]] has no page',
    );
    expect(lines[1].startsWith('::warning file=FACTSHEET.md,title=FM_MISSING::')).toBe(true);
  });

  test('github escapes percent signs and newlines so a message cannot break the command', () => {
    const line = formatGithub(report).split('\n')[1];
    expect(line).toContain('100%25 untyped');
    expect(line).toContain('%0Asecond line');
    expect(line.includes('\n')).toBe(false);
  });

  test('github prefixes the brain folder so annotations land on the right file', () => {
    expect(formatGithub(report, './brains/acme/').split('\n')[0]).toContain('file=brains/acme/customers/acme.md,');
  });

  test('json round-trips the report', () => {
    expect(JSON.parse(format(report, 'json'))).toEqual(report);
  });
});
