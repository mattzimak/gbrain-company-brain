// Output formats for a lint report.
//   text    human-readable, the default
//   json    the raw report
//   github  GitHub Actions workflow commands, so findings show up as
//           annotations on the pull request that introduced them
import type { LintReport } from './lint.ts';

export type Format = 'text' | 'json' | 'github';
export const FORMATS: Format[] = ['text', 'json', 'github'];

// Workflow-command escaping, per the GitHub Actions toolkit.
const escapeData = (s: string) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (s: string) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

export function summary(report: LintReport): string {
  return `${report.pages} pages, ${report.errors} errors, ${report.warnings} warnings`;
}

export function formatText(report: LintReport): string {
  const lines = report.findings.map(
    (f) => `${f.severity === 'error' ? 'x' : '!'} ${f.code.padEnd(18)} ${f.file}  ${f.message}`,
  );
  return [...lines, '', summary(report)].join('\n');
}

// `prefix` is the brain's path inside the repository, so annotations land on
// the right file when the brain is a subfolder.
export function formatGithub(report: LintReport, prefix = ''): string {
  const base = prefix.replace(/^\.\/?/, '').replace(/\/+$/, '');
  const lines = report.findings.map((f) => {
    const file = base ? `${base}/${f.file}` : f.file;
    return `::${f.severity} file=${escapeProperty(file)},title=${escapeProperty(f.code)}::${escapeData(f.message)}`;
  });
  return [...lines, summary(report)].join('\n');
}

export function format(report: LintReport, fmt: Format, prefix = ''): string {
  if (fmt === 'json') return JSON.stringify(report, null, 2);
  if (fmt === 'github') return formatGithub(report, prefix);
  return formatText(report);
}
