import { describe, expect, test } from 'bun:test';
import { allowedTypes, folderFor, loadPack } from '../src/pack.ts';

const pack = loadPack();

// The page types used by agentmatik/template-intelligence templates and its
// AGENTS.md frontmatter contract. If the template grows a type, this list and
// the pack must grow with it.
const TEMPLATE_TYPES = [
  'customer', 'competitor', 'person', 'decision', 'meeting', 'weekly', 'company',
  'strategy', 'product', 'brand', 'ops', 'finance', 'sales', 'runbook',
  'supplier', 'distributor', 'extracted-facts',
];

describe('company-brain schema pack', () => {
  test('is a gbrain-schema-pack-v1 manifest extending gbrain-base-v2', () => {
    expect(pack.name).toBe('company-brain');
    expect(pack.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pack.extends).toBe('gbrain-base-v2');
  });

  test('declares no mapping_rules, so nothing in a company brain gets retyped', () => {
    expect(pack.mapping_rules ?? []).toEqual([]);
  });

  test('every template-intelligence page type is allowed', () => {
    const types = allowedTypes(pack);
    const missing = TEMPLATE_TYPES.filter((t) => !types.has(t));
    expect(missing).toEqual([]);
  });

  test('declares product itself, so gbrain-base-v2 cannot fold it into company', () => {
    expect(pack.page_types.map((t) => t.name)).toContain('product');
  });

  test('page type names are unique', () => {
    const names = pack.page_types.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('every frontmatter link and filing rule points at a known type and verb', () => {
    const types = allowedTypes(pack);
    const inheritedVerbs = ['attended', 'supersedes', 'partner_of', 'works_at', 'mentions'];
    const verbs = new Set([...inheritedVerbs, ...pack.link_types.map((l) => l.name)]);
    for (const fl of pack.frontmatter_links) {
      expect(types.has(fl.page_type)).toBe(true);
      expect(verbs.has(fl.link_type)).toBe(true);
    }
    for (const rule of pack.filing_rules) {
      expect(types.has(rule.kind)).toBe(true);
      expect(rule.directory.endsWith('/')).toBe(true);
    }
  });

  test('entity folders match the template layout', () => {
    const folders = folderFor(pack);
    expect(folders.get('customer')).toBe('customers/');
    expect(folders.get('decision')).toBe('decisions/');
    expect(folders.get('meeting')).toBe('meetings/');
    expect(folders.get('person')).toBe('people/');
  });

  test('phrase regexes compile and match the sentences they are meant for', () => {
    const verb = (name: string) => new RegExp(pack.link_types.find((l) => l.name === name)!.inference!.regex!);
    expect(verb('decided_in').test('Agreed in [[meetings/x]]')).toBe(true);
    expect(verb('decided_in').test('Decided by [[people/x]]')).toBe(false);
    expect(verb('competes_with').test('Competes with [[company]] on price')).toBe(true);
    expect(verb('champion').test('operations lead, is the champion inside the account')).toBe(true);
  });
});
