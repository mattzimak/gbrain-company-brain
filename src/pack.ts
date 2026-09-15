// Reads schema/company-brain.yaml and exposes what the linter needs:
// the page types a brain may use and the folder each kind must live in.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PackPageType {
  name: string;
  primitive: string;
  path_prefixes?: string[];
}

export interface PackFilingRule {
  kind: string;
  directory: string;
  description?: string;
}

export interface CompanyBrainPack {
  name: string;
  version: string;
  extends: string | null;
  page_types: PackPageType[];
  link_types: { name: string; inverse?: string }[];
  frontmatter_links: { page_type: string; fields: string[]; link_type: string }[];
  filing_rules: PackFilingRule[];
  mapping_rules?: unknown[];
}

export const PACK_PATH = join(import.meta.dir, '..', 'schema', 'company-brain.yaml');

// Page types the pack inherits from gbrain-base-v2 (gbrain 0.50). A brain may
// use these alongside the company-brain types. Kept as a list because the
// linter runs without gbrain installed; the e2e test checks the resolved pack.
export const INHERITED_TYPES = [
  'person', 'company', 'media', 'tweet', 'social-digest', 'analysis', 'atom',
  'concept', 'source', 'deal', 'email', 'slack', 'meeting', 'conversation',
  'writing', 'project', 'note', 'event', 'diary',
] as const;

export function loadPack(path: string = PACK_PATH): CompanyBrainPack {
  const pack = Bun.YAML.parse(readFileSync(path, 'utf8')) as CompanyBrainPack;
  if (!pack || !Array.isArray(pack.page_types)) {
    throw new Error(`Not a schema pack: ${path}`);
  }
  return pack;
}

/** Every page type a company brain may declare in frontmatter. */
export function allowedTypes(pack: CompanyBrainPack): Set<string> {
  return new Set([...INHERITED_TYPES, ...pack.page_types.map((t) => t.name)]);
}

/** Map of page type -> required folder, from the pack's filing rules. */
export function folderFor(pack: CompanyBrainPack): Map<string, string> {
  return new Map(pack.filing_rules.map((r) => [r.kind, r.directory]));
}
