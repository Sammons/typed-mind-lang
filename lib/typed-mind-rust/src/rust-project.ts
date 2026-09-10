import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export interface CargoProject {
  readonly name: string;
  readonly version: string;
  readonly sourceDir: string;
  readonly projectRoot: string;
  readonly dependencies: readonly CargoDependency[];
  readonly isLibrary: boolean;
  readonly isBinary: boolean;
}

export interface CargoDependency {
  readonly name: string;
  readonly version: string | undefined;
}

// Line-based Cargo.toml parser — covers [package], [dependencies], and
// [[bin]] / [lib] sections. Full TOML parsing (nested tables, inline tables,
// multiline strings) is out of scope; Cargo.toml dependency declarations use
// either `name = "version"` or `name = { version = "..." }` which this
// handles.
export function parseCargoToml(content: string): {
  name: string;
  version: string;
  dependencies: CargoDependency[];
  isLibrary: boolean;
  isBinary: boolean;
} {
  const lines = content.split('\n');
  let currentSection = '';
  let name = '';
  let version = '';
  const dependencies: CargoDependency[] = [];
  let hasLib = false;
  let hasBin = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments and blank lines.
    if (line.startsWith('#') || line === '') continue;

    // Section headers.
    const sectionMatch = line.match(/^\[{1,2}([^\]]+)\]{1,2}$/);
    if (sectionMatch) {
      currentSection = (sectionMatch[1] ?? '').trim();
      if (currentSection === 'lib') hasLib = true;
      if (currentSection === 'bin') hasBin = true;
      continue;
    }

    // Key-value pairs.
    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1] ?? '';
    const rawValue = (kvMatch[2] ?? '').trim();

    if (currentSection === 'package') {
      if (key === 'name') name = stripQuotes(rawValue);
      if (key === 'version') version = stripQuotes(rawValue);
    }

    if (currentSection === 'dependencies' || currentSection === 'dev-dependencies') {
      const depVersion = extractDependencyVersion(rawValue);
      dependencies.push({ name: key, version: depVersion });
    }
  }

  // Default to library if src/lib.rs exists and no explicit [lib]/[[bin]].
  if (!hasLib && !hasBin) {
    hasLib = true;
    hasBin = true;
  }

  return { name, version, dependencies, isLibrary: hasLib, isBinary: hasBin };
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function extractDependencyVersion(rawValue: string): string | undefined {
  // Simple string: `"0.8"`
  const simple = stripQuotes(rawValue);
  if (!rawValue.startsWith('{')) return simple;

  // Inline table: `{ version = "1.0", features = [...] }`
  const versionMatch = rawValue.match(/version\s*=\s*"([^"]+)"/);
  return versionMatch?.[1];
}

export function findCargoToml(startPath: string): string | undefined {
  const resolved = resolve(startPath);
  const cargoPath = join(resolved, 'Cargo.toml');
  if (existsSync(cargoPath)) return cargoPath;

  // Walk up one level.
  const parent = dirname(resolved);
  if (parent !== resolved) {
    const parentCargo = join(parent, 'Cargo.toml');
    if (existsSync(parentCargo)) return parentCargo;
  }

  return undefined;
}

export function loadCargoProject(cargoTomlPath: string): CargoProject {
  const content = readFileSync(cargoTomlPath, 'utf-8');
  const parsed = parseCargoToml(content);
  const projectRoot = dirname(cargoTomlPath);
  const sourceDir = join(projectRoot, 'src');

  return {
    name: parsed.name,
    version: parsed.version,
    sourceDir,
    projectRoot,
    dependencies: parsed.dependencies,
    isLibrary: parsed.isLibrary,
    isBinary: parsed.isBinary,
  };
}

// Collect all .rs files under a directory, returning paths relative to projectRoot.
export function collectRustFiles(dir: string, projectRoot: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden directories and target/.
        if (!entry.name.startsWith('.') && entry.name !== 'target') {
          walk(entryPath);
        }
      } else if (entry.name.endsWith('.rs')) {
        files.push(relative(projectRoot, entryPath));
      }
    }
  };

  walk(dir);
  return files.sort();
}
