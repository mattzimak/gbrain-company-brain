import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { lintBrain, timelineLines, wikilinks, type LintReport } from '../src/lint.ts';

const SAMPLE = join(import.meta.dir, '..', 'fixtures', 'sample-brain');
const dirs: string[] = [];

function brain(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'company-brain-'));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function page(fm: Record<string, string>, body = 'Body.'): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n\n${body}\n`;
}

const ok = { status: 'active', owner: '"[[people/jane]]"', updated: '2026-09-01' };
const jane = page({ type: 'person', ...ok });
const codes = (r: LintReport) => r.findings.map((f) => f.code).sort();

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('lintBrain', () => {
  test('the fictional sample brain is clean', () => {
    const report = lintBrain(SAMPLE);
    expect(report.pages).toBe(15);
    expect(report.findings).toEqual([]);
  });

  test('flags a page without frontmatter as an error', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'notes.md': 'Just text.' }));
    expect(codes(r)).toEqual(['FM_MISSING']);
    expect(r.errors).toBe(1);
  });

  test('FACTSHEET.md without frontmatter is only a warning', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'FACTSHEET.md': '# Fact sheet' }));
    expect(r.errors).toBe(0);
    expect(codes(r)).toEqual(['FM_MISSING']);
  });

  test('flags a type the pack does not declare', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'partners/x.md': page({ type: 'partner', ...ok }) }));
    expect(codes(r)).toEqual(['TYPE_UNDECLARED']);
  });

  test('flags a page filed in the wrong folder', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'people/acme.md': page({ type: 'customer', ...ok }) }));
    expect(codes(r)).toEqual(['WRONG_FOLDER']);
  });

  test('flags a decision without a dated filename', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'decisions/focus.md': page({ type: 'decision', ...ok }) }));
    expect(codes(r)).toEqual(['DECISION_FILENAME']);
  });

  test('flags missing type and status as errors and missing owner as a warning', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'customers/acme.md': page({ title: 'Acme' }) }));
    expect(codes(r)).toEqual(['FIELD_MISSING', 'FIELD_MISSING', 'FIELD_MISSING', 'FIELD_MISSING']);
    expect(r.errors).toBe(2);
    expect(r.warnings).toBe(2);
  });

  test('flags a verified page with no last_verified date', () => {
    const r = lintBrain(brain({ 'people/jane.md': page({ type: 'person', ...ok, status: 'verified' }) }));
    expect(codes(r)).toEqual(['VERIFIED_UNDATED']);
  });

  test('flags a wikilink to a page that does not exist', () => {
    const r = lintBrain(brain({ 'people/jane.md': page({ type: 'person', ...ok }, 'Works with [[people/ghost]].') }));
    expect(codes(r)).toEqual(['LINK_DANGLING']);
  });

  test('flags an undated timeline entry below the separator', () => {
    const body = 'Compiled truth.\n\n---\n\n- 2026-09-01: Dated.\n- Undated entry';
    const r = lintBrain(brain({ 'people/jane.md': page({ type: 'person', ...ok }, body) }));
    expect(codes(r)).toEqual(['TIMELINE_UNDATED']);
  });

  test('skips repo scaffolding such as templates/ and README.md', () => {
    const r = lintBrain(brain({ 'people/jane.md': jane, 'templates/customer.md': 'x', 'README.md': 'x' }));
    expect(r.pages).toBe(1);
    expect(r.findings).toEqual([]);
  });
});

describe('helpers', () => {
  test('wikilinks reads frontmatter and body, dropping aliases and anchors', () => {
    const links = wikilinks({
      file: 'a.md', slug: 'a',
      frontmatter: { owner: '[[people/jane]]' },
      body: 'See [[customers/acme|Acme]] and [[decisions/x#why]].',
    });
    expect(links).toEqual(['people/jane', 'customers/acme', 'decisions/x']);
  });

  test('timelineLines only returns bullet lines after the separator', () => {
    expect(timelineLines('Truth\n- not timeline\n---\n- 2026-01-01: yes')).toEqual(['- 2026-01-01: yes']);
    expect(timelineLines('No separator\n- bullet')).toEqual([]);
  });
});
