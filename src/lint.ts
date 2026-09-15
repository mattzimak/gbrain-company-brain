// Lints a company brain (template-intelligence layout) before it is synced
// into gbrain. Everything flagged here is something gbrain would silently
// mis-type, drop from the graph, or file in the wrong place.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { allowedTypes, folderFor, loadPack, type CompanyBrainPack } from './pack.ts';

export type Severity = 'error' | 'warning';

export interface Finding {
  code: string;
  severity: Severity;
  file: string;
  message: string;
}

export interface LintReport {
  root: string;
  pages: number;
  errors: number;
  warnings: number;
  findings: Finding[];
}

export interface Page {
  file: string; // path relative to the brain root, forward slashes
  slug: string; // file without .md
  frontmatter: Record<string, unknown> | null;
  body: string;
}

// Repo scaffolding, not knowledge. Never linted, never a link target.
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'templates', 'docs', 'skills', 'scripts']);
const SKIP_FILES = new Set([
  'README.md', 'AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'INDEX.md',
]);

// Root reference sheets are allowed without frontmatter, but gbrain imports
// them untyped, so they are reported as warnings instead of errors.
const REFERENCE_FILES = new Set(['FACTSHEET.md']);

const STATUSES = new Set(['draft', 'active', 'verified', 'superseded', 'archived']);
const DECISION_FILE = /^decisions\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const TIMELINE_ENTRY = /^- \d{4}-\d{2}-\d{2}\b/;

export function parsePage(root: string, abs: string): Page {
  const file = relative(root, abs).split(sep).join('/');
  const raw = readFileSync(abs, 'utf8');
  const slug = file.replace(/\.md$/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { file, slug, frontmatter: null, body: raw };
  let frontmatter: Record<string, unknown> | null;
  try {
    const parsed = Bun.YAML.parse(m[1]);
    frontmatter = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    frontmatter = null;
  }
  return { file, slug, frontmatter, body: m[2] };
}

export function walkBrain(root: string): Page[] {
  const pages: Page[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        if (!SKIP_DIRS.has(name)) visit(abs);
      } else if (name.endsWith('.md') && !SKIP_FILES.has(name)) {
        pages.push(parsePage(root, abs));
      }
    }
  };
  visit(root);
  return pages;
}

/** Wikilink targets in a page (frontmatter values included), normalised. */
export function wikilinks(page: Page): string[] {
  const text = `${JSON.stringify(page.frontmatter ?? {})}\n${page.body}`;
  return [...text.matchAll(WIKILINK)].map((m) => m[1].trim().replace(/\.md$/, ''));
}

/** Lines of the timeline: everything after the first body `---` separator. */
export function timelineLines(body: string): string[] {
  const parts = body.split(/^---\s*$/m);
  if (parts.length < 2) return [];
  return parts.slice(1).join('\n').split('\n').filter((l) => l.startsWith('- '));
}

export function lintBrain(root: string, pack: CompanyBrainPack = loadPack()): LintReport {
  const pages = walkBrain(root);
  const types = allowedTypes(pack);
  const folders = folderFor(pack);
  const slugs = new Set(pages.map((p) => p.slug));
  const findings: Finding[] = [];
  const add = (severity: Severity, code: string, file: string, message: string) =>
    findings.push({ code, severity, file, message });

  for (const page of pages) {
    const fm = page.frontmatter;
    if (!fm) {
      add(REFERENCE_FILES.has(page.file) ? 'warning' : 'error', 'FM_MISSING', page.file,
        'No readable frontmatter; gbrain will treat this page as untyped.');
      continue;
    }

    const type = typeof fm.type === 'string' ? fm.type : undefined;
    if (!type) {
      add('error', 'FIELD_MISSING', page.file, 'Frontmatter has no `type`.');
    } else if (!types.has(type)) {
      add('error', 'TYPE_UNDECLARED', page.file,
        `Type \`${type}\` is not declared by the company-brain pack; gbrain-base-v2 would retype it to note.`);
    }
    if (typeof fm.status !== 'string') {
      add('error', 'FIELD_MISSING', page.file, 'Frontmatter has no `status`.');
    } else if (!STATUSES.has(fm.status)) {
      add('warning', 'STATUS_INVALID', page.file,
        `Status \`${fm.status}\` is not one of ${[...STATUSES].join(', ')}.`);
    }
    if (fm.status === 'verified' && !fm.last_verified) {
      add('warning', 'VERIFIED_UNDATED', page.file, 'Page is `verified` but has no `last_verified` date.');
    }
    if (type !== 'extracted-facts') {
      for (const field of ['owner', 'updated']) {
        if (fm[field] == null || fm[field] === '') {
          add('warning', 'FIELD_MISSING', page.file, `Frontmatter has no \`${field}\`.`);
        }
      }
    }

    const folder = type ? folders.get(type) : undefined;
    if (folder && !page.file.startsWith(folder)) {
      add('error', 'WRONG_FOLDER', page.file, `Type \`${type}\` belongs in \`${folder}\`.`);
    }
    if (type === 'decision' && !DECISION_FILE.test(page.file)) {
      add('error', 'DECISION_FILENAME', page.file, 'Decisions are named decisions/YYYY-MM-DD-slug.md.');
    }

    for (const target of wikilinks(page)) {
      if (!slugs.has(target)) {
        add('warning', 'LINK_DANGLING', page.file, `[[${target}]] does not resolve to a page; gbrain drops the edge.`);
      }
    }
    for (const line of timelineLines(page.body)) {
      if (!TIMELINE_ENTRY.test(line)) {
        add('warning', 'TIMELINE_UNDATED', page.file, `Timeline entry is not dated: "${line.slice(0, 60)}"`);
      }
    }
  }

  return {
    root,
    pages: pages.length,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    findings,
  };
}
