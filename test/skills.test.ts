import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'skillpack.json'), 'utf8'));

interface Skill { dir: string; fm: { name: string; description: string; mutating: boolean; triggers: string[] } }

const skills: Skill[] = manifest.skills.map((dir: string) => {
  const raw = readFileSync(join(ROOT, dir, 'SKILL.md'), 'utf8');
  const fm = Bun.YAML.parse(raw.match(/^---\n([\s\S]*?)\n---/)![1]);
  return { dir, fm };
});

describe('skills', () => {
  test('the manifest lists every skill folder on disk', () => {
    const onDisk = readdirSync(join(ROOT, 'skills')).map((d) => `skills/${d}`).sort();
    expect([...manifest.skills].sort()).toEqual(onDisk);
  });

  test('each SKILL.md names its folder and declares description, mutating and triggers', () => {
    for (const { dir, fm } of skills) {
      expect(fm.name).toBe(dir.split('/')[1]);
      expect(fm.description.length).toBeGreaterThan(40);
      expect(typeof fm.mutating).toBe('boolean');
      expect(fm.triggers.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('only company-brain-ask is read-only', () => {
    const readOnly = skills.filter((s) => !s.fm.mutating).map((s) => s.fm.name);
    expect(readOnly).toEqual(['company-brain-ask']);
  });

  test('no trigger phrase is shared between skills', () => {
    const all = skills.flatMap((s) => s.fm.triggers.map((t) => t.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  test('each routing eval has at least 5 intents, all routed to its own skill', () => {
    for (const { dir, fm } of skills) {
      const lines = readFileSync(join(ROOT, dir, 'routing-eval.jsonl'), 'utf8').trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(5);
      for (const line of lines) {
        const row = JSON.parse(line);
        expect(row.expected_skill).toBe(fm.name);
        expect(fm.triggers.map((t) => t.toLowerCase())).not.toContain(row.intent.toLowerCase());
      }
    }
  });

  test('each judge eval has at least 3 cases with criteria', () => {
    const evals = readdirSync(join(ROOT, 'evals')).filter((f) => f.endsWith('.judge.json'));
    expect(evals.length).toBe(skills.length);
    for (const file of evals) {
      const spec = JSON.parse(readFileSync(join(ROOT, 'evals', file), 'utf8'));
      expect(spec.cases.length).toBeGreaterThanOrEqual(3);
      for (const c of spec.cases) expect(c.criteria.length).toBeGreaterThan(40);
    }
  });
});
