import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSERTION_CODES, type AssertionCodeEntry } from '../typed-mind-typescript/src/assertion-codes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function anchorId(code: string): string {
  return code.replace(/\//g, '-');
}

function renderCode(code: string, entry: AssertionCodeEntry): string {
  const id = anchorId(code);
  const severityClass = entry.severity === 'error' ? 'severity-error' : 'severity-warning';
  return `
        <div class="diagnostic-entry" id="${id}">
            <h3><a href="#${id}" class="anchor-link">${escapeHtml(code)}</a></h3>
            <div class="diagnostic-meta">
                <span class="severity-badge ${severityClass}">${entry.severity}</span>
                <span class="diagnostic-message">${escapeHtml(entry.message)}</span>
            </div>
            <div class="diagnostic-suggestion">
                <strong>Suggestion:</strong> ${escapeHtml(entry.suggestion)}
            </div>
            <div class="diagnostic-body">
                <p>${escapeHtml(entry.docBody)}</p>
            </div>
            <div class="diagnostic-cli">
                <code>typed-mind-ts explain ${escapeHtml(code)}</code>
            </div>
        </div>`;
}

function groupByNamespace(codes: Record<string, AssertionCodeEntry>): Map<string, [string, AssertionCodeEntry][]> {
  const groups = new Map<string, [string, AssertionCodeEntry][]>();
  for (const [code, entry] of Object.entries(codes)) {
    const parts = code.split('/');
    const ns = parts[0];
    const suffix = parts.slice(1).join('/');
    const group = groups.get(ns) ?? [];
    group.push([code, entry]);
    groups.set(ns, group);
  }
  return groups;
}

const groups = groupByNamespace(ASSERTION_CODES as Record<string, AssertionCodeEntry>);
const totalCodes = Object.keys(ASSERTION_CODES).length;
const errorCount = Object.values(ASSERTION_CODES).filter(e => (e as AssertionCodeEntry).severity === 'error').length;
const warningCount = totalCodes - errorCount;

let codeListHtml = '';
let codeEntriesHtml = '';

for (const [ns, entries] of groups) {
  const sectionTitle = ns.charAt(0).toUpperCase() + ns.slice(1);

  codeListHtml += `<li class="toc-group"><strong>${escapeHtml(sectionTitle)}</strong><ul>`;
  for (const [code, entry] of entries) {
    const severityIcon = entry.severity === 'error' ? '●' : '○';
    codeListHtml += `<li><a href="#${anchorId(code)}">${severityIcon} ${escapeHtml(code)}</a></li>`;
  }
  codeListHtml += `</ul></li>`;

  codeEntriesHtml += `\n        <h2 id="${escapeHtml(ns)}-codes">${escapeHtml(sectionTitle)} Diagnostics</h2>`;
  for (const [code, entry] of entries) {
    codeEntriesHtml += renderCode(code, entry);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnostic Reference - TypedMind</title>
    <meta name="description" content="Complete reference for TypedMind diagnostic codes, messages, and suggested fixes.">
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="shortcut icon" href="favicon.ico">
    <link rel="stylesheet" href="assets/css/styles.css">
    <style>
        .diagnostics-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .diagnostics-header {
            margin-bottom: 2rem;
        }
        .diagnostics-header h1 {
            margin-bottom: 0.5rem;
        }
        .diagnostics-stats {
            color: var(--text-secondary, #666);
            font-size: 0.9rem;
        }
        .toc {
            background: var(--bg-secondary, #f5f5f5);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .toc h2 {
            margin-top: 0;
            font-size: 1.1rem;
        }
        .toc ul {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }
        .toc .toc-group > ul {
            padding-left: 1.2rem;
        }
        .toc li {
            margin: 0.3rem 0;
        }
        .toc a {
            text-decoration: none;
            color: var(--text-primary, #333);
            font-family: monospace;
            font-size: 0.85rem;
        }
        .toc a:hover {
            color: var(--accent, #0066cc);
        }
        .diagnostic-entry {
            border: 1px solid var(--border, #e0e0e0);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .diagnostic-entry h3 {
            margin-top: 0;
            font-family: monospace;
            font-size: 1.1rem;
        }
        .anchor-link {
            text-decoration: none;
            color: inherit;
        }
        .anchor-link:hover {
            color: var(--accent, #0066cc);
        }
        .diagnostic-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .severity-badge {
            display: inline-block;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .severity-error {
            background: #fee;
            color: #c00;
        }
        .severity-warning {
            background: #fff8e1;
            color: #b8860b;
        }
        .diagnostic-message {
            color: var(--text-secondary, #666);
        }
        .diagnostic-suggestion {
            background: var(--bg-secondary, #f5f5f5);
            border-radius: 4px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        .diagnostic-body p {
            line-height: 1.6;
            margin: 0;
        }
        .diagnostic-cli {
            margin-top: 0.75rem;
            font-size: 0.85rem;
            color: var(--text-secondary, #666);
        }
        .diagnostic-cli code {
            background: var(--bg-secondary, #f5f5f5);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="nav-brand">
                <img src="images/typedmind_transparent.png" alt="TypedMind Logo" class="nav-logo">
                TypedMind
            </div>
            <ul class="nav-menu" id="navMenu">
                <li><a href="index.html">Home</a></li>
                <li><a href="playground.html">Playground</a></li>
                <li><a href="diagnostics.html" class="active">Diagnostics</a></li>
                <li><a href="https://github.com/sammons/typed-mind-lang" target="_blank">GitHub</a></li>
            </ul>
        </div>
    </nav>

    <main class="diagnostics-container">
        <div class="diagnostics-header">
            <h1>Diagnostic Reference</h1>
            <p class="diagnostics-stats">${totalCodes} codes: ${errorCount} errors, ${warningCount} warnings</p>
            <p>Every diagnostic produced by the TypedMind assertion engine is listed below with its code, severity, suggested fix, and detailed explanation. Use <code>typed-mind-ts explain &lt;code&gt;</code> in the CLI for the same information.</p>
        </div>

        <div class="toc">
            <h2>Codes</h2>
            <ul>
                ${codeListHtml}
            </ul>
        </div>

        ${codeEntriesHtml}
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>TypedMind</h4>
                    <p>The Architecture DSL designed for LLMs</p>
                </div>
                <div class="footer-section">
                    <h4>Resources</h4>
                    <ul>
                        <li><a href="index.html">Documentation</a></li>
                        <li><a href="playground.html">Playground</a></li>
                        <li><a href="diagnostics.html">Diagnostics</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Community</h4>
                    <ul>
                        <li><a href="https://github.com/sammons/typed-mind-lang">GitHub</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025-<script>document.write(new Date().getFullYear())<\/script> Sammons Software LLC. Open source under MIT License.</p>
            </div>
        </div>
    </footer>
</body>
</html>`;

writeFileSync(join(distDir, 'diagnostics.html'), html);
console.log(`Generated diagnostics.html (${totalCodes} codes)`);
