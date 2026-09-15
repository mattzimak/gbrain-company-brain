// End-to-end: a real gbrain, a throwaway PGLite brain, the company-brain pack
// and the fictional sample brain. Runs when a `gbrain` binary is on PATH (or
// GBRAIN_BIN points at one); skips otherwise. GBRAIN_HOME isolates everything
// from the user's own ~/.gbrain.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PACK_PATH } from '../src/pack.ts';

const GBRAIN = process.env.GBRAIN_BIN ?? Bun.which('gbrain');
const SAMPLE = join(import.meta.dir, '..', 'fixtures', 'sample-brain');
const home = mkdtempSync(join(tmpdir(), 'company-brain-e2e-'));

function gbrain(...args: string[]): string {
  const run = Bun.spawnSync([GBRAIN!, ...args], {
    cwd: home,
    env: { ...process.env, GBRAIN_HOME: home },
  });
  if (run.exitCode !== 0) {
    throw new Error(`gbrain ${args.join(' ')} failed:\n${run.stderr.toString()}`);
  }
  return run.stdout.toString();
}

function edges(slug: string): string[] {
  const graph = JSON.parse(gbrain('graph', slug, '--depth', '1')) as {
    slug: string; links: { link_type: string; to_slug: string }[];
  }[];
  const root = graph.find((n) => n.slug === slug)!;
  return [...new Set(root.links.map((l) => `${l.link_type} -> ${l.to_slug}`))].sort();
}

describe.skipIf(!GBRAIN)('company-brain on a real gbrain', () => {
  beforeAll(() => {
    const packDir = join(home, '.gbrain', 'schema-packs', 'company-brain');
    mkdirSync(packDir, { recursive: true });
    copyFileSync(PACK_PATH, join(packDir, 'pack.yaml'));
    gbrain('init', '--pglite');
    gbrain('schema', 'use', 'company-brain');
    gbrain('import', SAMPLE, '--no-embed');
    gbrain('extract', 'links', '--source', 'db', '--include-frontmatter');
  }, 300_000);

  afterAll(() => rmSync(home, { recursive: true, force: true }));

  test('the pack validates and is active', () => {
    expect(gbrain('schema', 'validate', 'company-brain')).toContain('valid manifest');
    expect(gbrain('schema', 'active')).toContain('Active pack: company-brain');
  });

  test('every page lands with its company-brain type', () => {
    const stats = JSON.parse(gbrain('schema', 'stats', '--json'));
    expect(stats.aggregate.total_pages).toBe(15);
    expect(stats.aggregate.untyped_pages).toBe(0);
    const byType = Object.fromEntries(
      stats.aggregate.by_type.map((t: { type: string; count: number }) => [t.type, t.count]),
    );
    expect(byType).toMatchObject({
      customer: 1, competitor: 1, supplier: 1, decision: 2, meeting: 2,
      weekly: 1, product: 1, strategy: 1, 'extracted-facts': 1, person: 3, company: 1,
    });
  });

  test('frontmatter owner and supersedes become typed edges', () => {
    expect(edges('decisions/2026-08-20-focus-3pl')).toEqual(expect.arrayContaining([
      'owned_by -> people/jane-doe',
      'supersedes -> decisions/2026-05-02-focus-grocery',
    ]));
    expect(edges('customers/acme-logistics')).toContain('owned_by -> people/jane-doe');
  });

  test('sentence cues become typed edges', () => {
    expect(edges('decisions/2026-08-20-focus-3pl')).toContain('decided_in -> meetings/2026-08-19-gtm-review');
    expect(edges('competitors/orbit-picking')).toContain('competes_with -> company');
    expect(edges('customers/acme-logistics')).toContain('champion -> people/sam-lee');
  });

  test('meeting attendees are linked', () => {
    expect(edges('meetings/2026-09-10-acme-qbr')).toEqual(expect.arrayContaining([
      'attended -> people/jane-doe',
      'attended -> people/sam-lee',
    ]));
  });
});
