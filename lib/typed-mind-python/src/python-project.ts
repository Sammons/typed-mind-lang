import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

export interface PythonDependency {
  readonly name: string;
  readonly version: string | undefined;
}

export interface PythonProjectInfo {
  readonly projectRoot: string;
  readonly sourceRoot: string;
  readonly dependencies: readonly PythonDependency[];
  readonly pythonFiles: readonly string[];
}

/** Extract name and optional version from a PEP 508 dependency string. */
const parseDependencySpec = (line: string): PythonDependency | undefined => {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return undefined;
  // Remove extras, markers, etc. — keep name and version specifier
  const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*(?:\[.*?\])?\s*(.*)/);
  if (!match) return undefined;
  const name = match[1] ?? '';
  const versionPart = match[2]?.trim() ?? '';
  // Extract version from specifiers like >=3.0, ==1.2.3, ~=2.0
  const versionMatch = versionPart.match(/[><=~!]+\s*([0-9][0-9.]*)/);
  return { name, version: versionMatch?.[1] };
};

/** Parse dependencies from pyproject.toml using line-based regex. */
const parsePyprojectToml = (content: string): { dependencies: PythonDependency[]; sourceRoot: string | undefined } => {
  const dependencies: PythonDependency[] = [];
  let sourceRoot: string | undefined;

  // Extract [project.dependencies] section
  const depSectionMatch = content.match(/\[project\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  if (depSectionMatch) {
    const projectSection = depSectionMatch[1] ?? '';
    // Look for dependencies = [...] in the project section
    const depsMatch = projectSection.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsMatch) {
      const depsBlock = depsMatch[1] ?? '';
      for (const line of depsBlock.split('\n')) {
        const cleaned = line.replace(/["',]/g, '').trim();
        const dep = parseDependencySpec(cleaned);
        if (dep) dependencies.push(dep);
      }
    }
  }

  // Extract source root from [tool.setuptools.packages.find] or similar
  const findMatch = content.match(/\[tool\.setuptools\.packages\.find\]\s*\n[\s\S]*?where\s*=\s*\["([^"]+)"\]/);
  if (findMatch) {
    sourceRoot = findMatch[1];
  }

  // Also check [tool.setuptools.package-dir] for src layout
  const pkgDirMatch = content.match(/\[tool\.setuptools\.package-dir\]\s*\n[\s\S]*?""\s*=\s*"([^"]+)"/);
  if (pkgDirMatch) {
    sourceRoot = pkgDirMatch[1];
  }

  return { dependencies, sourceRoot };
};

/** Parse dependencies from requirements.txt. */
const parseRequirementsTxt = (content: string): PythonDependency[] => {
  const dependencies: PythonDependency[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip comments, options flags, and -r/-c includes
    if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.length === 0) continue;
    const dep = parseDependencySpec(trimmed);
    if (dep) dependencies.push(dep);
  }
  return dependencies;
};

/** Parse dependencies from setup.py using basic regex extraction. */
const parseSetupPy = (content: string): PythonDependency[] => {
  const dependencies: PythonDependency[] = [];
  const installRequiresMatch = content.match(/install_requires\s*=\s*\[([\s\S]*?)\]/);
  if (installRequiresMatch) {
    const block = installRequiresMatch[1] ?? '';
    for (const line of block.split('\n')) {
      const cleaned = line.replace(/["',]/g, '').trim();
      const dep = parseDependencySpec(cleaned);
      if (dep) dependencies.push(dep);
    }
  }
  return dependencies;
};

/** Parse dependencies from setup.cfg. */
const parseSetupCfg = (content: string): PythonDependency[] => {
  const dependencies: PythonDependency[] = [];
  const optionsMatch = content.match(/\[options\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  if (optionsMatch) {
    const optionsSection = optionsMatch[1] ?? '';
    const installRequiresMatch = optionsSection.match(/install_requires\s*=\s*\n((?:\s+\S.*\n?)*)/);
    if (installRequiresMatch) {
      for (const line of (installRequiresMatch[1] ?? '').split('\n')) {
        const dep = parseDependencySpec(line);
        if (dep) dependencies.push(dep);
      }
    }
  }
  return dependencies;
};

/** Recursively collect .py files under a directory. */
const collectPythonFiles = (dir: string, projectRoot: string): string[] => {
  const files: string[] = [];
  const stack = [dir];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden dirs, __pycache__, .git, node_modules, venv, .venv
        if (
          entry.name.startsWith('.') ||
          entry.name === '__pycache__' ||
          entry.name === 'node_modules' ||
          entry.name === 'venv' ||
          entry.name === '.venv'
        ) {
          continue;
        }
        stack.push(fullPath);
      } else if (entry.name.endsWith('.py')) {
        files.push(relative(projectRoot, fullPath));
      }
    }
  }
  return files.sort();
};

/** Resolve a Python project from a directory path. */
export const resolveProject = (projectPath: string): PythonProjectInfo => {
  const projectRoot = resolve(projectPath);
  let dependencies: PythonDependency[] = [];
  let sourceRoot: string | undefined;

  // Try pyproject.toml first
  const pyprojectPath = join(projectRoot, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    const content = readFileSync(pyprojectPath, 'utf-8');
    const result = parsePyprojectToml(content);
    dependencies = result.dependencies;
    sourceRoot = result.sourceRoot;
  }

  // Supplement with requirements.txt
  const requirementsPath = join(projectRoot, 'requirements.txt');
  if (existsSync(requirementsPath) && dependencies.length === 0) {
    const content = readFileSync(requirementsPath, 'utf-8');
    dependencies = parseRequirementsTxt(content);
  }

  // Supplement with setup.py
  const setupPyPath = join(projectRoot, 'setup.py');
  if (existsSync(setupPyPath) && dependencies.length === 0) {
    const content = readFileSync(setupPyPath, 'utf-8');
    dependencies = parseSetupPy(content);
  }

  // Supplement with setup.cfg
  const setupCfgPath = join(projectRoot, 'setup.cfg');
  if (existsSync(setupCfgPath) && dependencies.length === 0) {
    const content = readFileSync(setupCfgPath, 'utf-8');
    dependencies = parseSetupCfg(content);
  }

  // Resolve source root
  const resolvedSourceRoot = sourceRoot ? resolve(projectRoot, sourceRoot) : projectRoot;

  // Collect Python files
  const pythonFiles = collectPythonFiles(resolvedSourceRoot, projectRoot);

  return {
    projectRoot,
    sourceRoot: relative(projectRoot, resolvedSourceRoot) || '.',
    dependencies,
    pythonFiles,
  };
};

/** Find the project root by walking up from a file looking for pyproject.toml, setup.py, or setup.cfg. */
export const findProjectRoot = (startPath: string): string => {
  let current = resolve(startPath);
  if (!statSync(current).isDirectory()) {
    current = dirname(current);
  }
  const sentinel = ['pyproject.toml', 'setup.py', 'setup.cfg'];
  while (current !== dirname(current)) {
    if (sentinel.some((name) => existsSync(join(current, name)))) {
      return current;
    }
    current = dirname(current);
  }
  return resolve(startPath);
};

/** Given an entrypoint, find all reachable Python files by following imports. */
export const resolveEntrypointFiles = (projectRoot: string, entrypoint: string): string[] => {
  const entryAbsolute = resolve(projectRoot, entrypoint);
  if (!existsSync(entryAbsolute)) {
    throw new Error(`Entrypoint not found: ${entryAbsolute}`);
  }

  const visited = new Set<string>();
  const queue = [entryAbsolute];
  const entryDir = dirname(entryAbsolute);

  // For package-based entrypoints, include __init__.py files
  const initPy = join(entryDir, '__init__.py');
  if (existsSync(initPy) && initPy !== entryAbsolute) {
    queue.push(initPy);
  }

  for (let filePath = queue.pop(); filePath !== undefined; filePath = queue.pop()) {
    if (visited.has(filePath)) continue;
    visited.add(filePath);

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Extract relative imports and resolve them
    const importRegex = /^from\s+(\.[.\w]*)\s+import/gm;
    let match = importRegex.exec(content);
    while (match !== null) {
      const importPath = match[1] ?? '';
      const resolved = resolveRelativeImport(filePath, importPath, projectRoot);
      if (resolved && !visited.has(resolved)) {
        queue.push(resolved);
        // If it resolves to a package __init__.py, also queue sibling modules
        const resolvedDir = dirname(resolved);
        if (basename(resolved) === '__init__.py') {
          const siblings = collectPythonFiles(resolvedDir, projectRoot);
          for (const sibling of siblings) {
            const abs = resolve(projectRoot, sibling);
            if (!visited.has(abs)) queue.push(abs);
          }
        }
      }
      match = importRegex.exec(content);
    }
  }

  return [...visited].map((f) => relative(projectRoot, f)).sort();
};

/** Resolve a relative import path to a file path. */
const resolveRelativeImport = (fromFile: string, importPath: string, _projectRoot: string): string | undefined => {
  // Count leading dots
  let dots = 0;
  while (dots < importPath.length && importPath[dots] === '.') dots++;
  const modulePart = importPath.slice(dots);

  // Navigate up from the current file
  let base = dirname(fromFile);
  for (let i = 1; i < dots; i++) {
    base = dirname(base);
  }

  if (modulePart.length > 0) {
    const parts = modulePart.split('.');
    const modulePath = join(base, ...parts);

    // Try as a package (__init__.py)
    const initPath = join(modulePath, '__init__.py');
    if (existsSync(initPath)) return initPath;

    // Try as a module (.py)
    const pyPath = `${modulePath}.py`;
    if (existsSync(pyPath)) return pyPath;
  } else {
    // Just dots — refers to the package __init__.py at that level
    const initPath = join(base, '__init__.py');
    if (existsSync(initPath)) return initPath;
  }

  return undefined;
};
