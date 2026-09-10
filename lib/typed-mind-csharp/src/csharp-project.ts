// Parse .csproj XML to find source files and package references.
// Uses regex over well-formed XML — .csproj files follow a predictable schema.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

export interface CsprojInfo {
  readonly projectPath: string;
  readonly assemblyName: string;
  readonly sourceFiles: readonly string[];
  readonly packageReferences: readonly PackageReference[];
}

export interface PackageReference {
  readonly name: string;
  readonly version: string | undefined;
}

const EXCLUDED_DIRS = new Set(['obj', 'bin', 'node_modules', '.git', '.vs']);

function findCsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...findCsFiles(join(dir, entry.name)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.cs')) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

export function parseCsproj(csprojPath: string): CsprojInfo {
  const absPath = resolve(csprojPath);
  const projectDir = dirname(absPath);
  const content = readFileSync(absPath, 'utf-8');

  // Extract AssemblyName or fall back to filename without extension
  const assemblyNameMatch = content.match(/<AssemblyName>([^<]+)<\/AssemblyName>/);
  const assemblyName = assemblyNameMatch?.[1] ?? basename(absPath, extname(absPath));

  // Extract PackageReference elements
  const packageReferences: PackageReference[] = [];
  const pkgRefPattern = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]*)")?[^/]*\/>/g;
  let pkgMatch = pkgRefPattern.exec(content);
  while (pkgMatch !== null) {
    const pkgName = pkgMatch[1];
    if (pkgName !== undefined) {
      packageReferences.push({
        name: pkgName,
        version: pkgMatch[2],
      });
    }
    pkgMatch = pkgRefPattern.exec(content);
  }
  // Handle multi-line PackageReference elements
  const pkgRefMultiPattern = /<PackageReference\s+Include="([^"]+)"[^>]*>[\s\S]*?<Version>([^<]*)<\/Version>[\s\S]*?<\/PackageReference>/g;
  let pkgMatchMulti = pkgRefMultiPattern.exec(content);
  while (pkgMatchMulti !== null) {
    const multiPkgName = pkgMatchMulti[1];
    const existing = packageReferences.find((p) => p.name === multiPkgName);
    if (existing === undefined && multiPkgName !== undefined) {
      packageReferences.push({
        name: multiPkgName,
        version: pkgMatchMulti[2],
      });
    }
    pkgMatchMulti = pkgRefMultiPattern.exec(content);
  }

  // Find all .cs files in the project directory
  const sourceFiles = findCsFiles(projectDir).map((f) => relative(projectDir, f));

  return {
    projectPath: projectDir,
    assemblyName,
    sourceFiles,
    packageReferences,
  };
}

export interface SlnProjectEntry {
  readonly name: string;
  readonly relativePath: string;
  readonly csprojPath: string;
}

export function parseSln(slnPath: string): SlnProjectEntry[] {
  const absPath = resolve(slnPath);
  const slnDir = dirname(absPath);
  const content = readFileSync(absPath, 'utf-8');
  const entries: SlnProjectEntry[] = [];

  // Match Project lines: Project("{GUID}") = "Name", "RelativePath", "{GUID}"
  const projectPattern = /Project\("[^"]*"\)\s*=\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,/g;
  let match = projectPattern.exec(content);
  while (match !== null) {
    const name = match[1] ?? '';
    const relativePath = match[2]?.replace(/\\/g, '/') ?? '';
    if (relativePath.endsWith('.csproj')) {
      const csprojPath = resolve(slnDir, relativePath);
      if (existsSync(csprojPath)) {
        entries.push({ name, relativePath, csprojPath });
      }
    }
    match = projectPattern.exec(content);
  }

  return entries;
}

export function resolveProjectConfig(input: string): { projectPath: string; configPath: string } {
  const absInput = resolve(input);

  if (absInput.endsWith('.sln')) {
    return { projectPath: dirname(absInput), configPath: absInput };
  }

  if (absInput.endsWith('.csproj')) {
    return { projectPath: dirname(absInput), configPath: absInput };
  }

  // Directory — look for .sln or .csproj
  if (existsSync(absInput) && statSync(absInput).isDirectory()) {
    const entries = readdirSync(absInput);
    const sln = entries.find((e) => e.endsWith('.sln'));
    if (sln !== undefined) {
      return { projectPath: absInput, configPath: join(absInput, sln) };
    }
    const csproj = entries.find((e) => e.endsWith('.csproj'));
    if (csproj !== undefined) {
      return { projectPath: absInput, configPath: join(absInput, csproj) };
    }
    // No config found — treat directory itself as the project path
    return { projectPath: absInput, configPath: absInput };
  }

  return { projectPath: absInput, configPath: absInput };
}
