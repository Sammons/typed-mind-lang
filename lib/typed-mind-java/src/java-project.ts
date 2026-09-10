import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface JavaProjectConfig {
  readonly sourceDirectories: readonly string[];
  readonly dependencies: readonly JavaDependency[];
  readonly buildTool: 'maven' | 'gradle' | 'none';
}

export interface JavaDependency {
  readonly groupId: string;
  readonly artifactId: string;
  readonly version: string;
  readonly scope: string;
}

const parseMavenDependencies = (pomContent: string): JavaDependency[] => {
  const deps: JavaDependency[] = [];
  // Extract <dependency> blocks from <dependencies> section
  const depsMatch = pomContent.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
  if (depsMatch === null) return deps;

  const depBlocks = depsMatch[1]?.match(/<dependency>([\s\S]*?)<\/dependency>/g);
  if (depBlocks === null || depBlocks === undefined) return deps;

  for (const block of depBlocks) {
    const groupId = block.match(/<groupId>(.*?)<\/groupId>/)?.[1] ?? '';
    const artifactId = block.match(/<artifactId>(.*?)<\/artifactId>/)?.[1] ?? '';
    const version = block.match(/<version>(.*?)<\/version>/)?.[1] ?? '';
    const scope = block.match(/<scope>(.*?)<\/scope>/)?.[1] ?? 'compile';
    deps.push({ groupId, artifactId, version, scope });
  }

  return deps;
};

const parseMavenSourceDirs = (pomContent: string, projectPath: string): string[] => {
  const dirs: string[] = [];

  // Check for custom sourceDirectory in build section
  const sourceDir = pomContent.match(/<sourceDirectory>(.*?)<\/sourceDirectory>/)?.[1];
  if (sourceDir !== undefined) {
    dirs.push(sourceDir);
  }

  // Default Maven source directory
  const defaultDir = join(projectPath, 'src/main/java');
  if (existsSync(defaultDir) && !dirs.includes('src/main/java')) {
    dirs.push('src/main/java');
  }

  // If no dirs found, fallback to project root
  if (dirs.length === 0) {
    dirs.push('.');
  }

  return dirs;
};

const parseGradleDependencies = (gradleContent: string): JavaDependency[] => {
  const deps: JavaDependency[] = [];
  // Match dependency declarations like: implementation 'group:artifact:version'
  // or: implementation "group:artifact:version"
  const depPattern =
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testCompileOnly|annotationProcessor)\s+['"]([^'"]+)['"]/g;
  let match = depPattern.exec(gradleContent);
  while (match !== null) {
    const parts = match[1]?.split(':');
    if (parts !== undefined && parts.length >= 2) {
      deps.push({
        groupId: parts[0] ?? '',
        artifactId: parts[1] ?? '',
        version: parts[2] ?? '',
        scope: match[0]?.startsWith('test') ? 'test' : 'compile',
      });
    }
    match = depPattern.exec(gradleContent);
  }
  return deps;
};

export const parseProjectConfig = (projectPath: string, configPath?: string): JavaProjectConfig => {
  const resolvedPath = resolve(projectPath);

  // Check for pom.xml (Maven)
  const pomPath = configPath ?? join(resolvedPath, 'pom.xml');
  if (existsSync(pomPath) && pomPath.endsWith('pom.xml')) {
    const pomContent = readFileSync(pomPath, 'utf-8');
    return {
      sourceDirectories: parseMavenSourceDirs(pomContent, resolvedPath),
      dependencies: parseMavenDependencies(pomContent),
      buildTool: 'maven',
    };
  }

  // Check for build.gradle or build.gradle.kts (Gradle)
  const gradlePath = join(resolvedPath, 'build.gradle');
  const gradleKtsPath = join(resolvedPath, 'build.gradle.kts');
  const actualGradlePath = existsSync(gradleKtsPath) ? gradleKtsPath : existsSync(gradlePath) ? gradlePath : undefined;

  if (actualGradlePath !== undefined) {
    const gradleContent = readFileSync(actualGradlePath, 'utf-8');
    // Gradle defaults to src/main/java
    const sourceDirs: string[] = [];
    const defaultDir = join(resolvedPath, 'src/main/java');
    if (existsSync(defaultDir)) {
      sourceDirs.push('src/main/java');
    } else {
      sourceDirs.push('.');
    }

    return {
      sourceDirectories: sourceDirs,
      dependencies: parseGradleDependencies(gradleContent),
      buildTool: 'gradle',
    };
  }

  // Fallback: scan for .java files from project root
  return {
    sourceDirectories: ['.'],
    dependencies: [],
    buildTool: 'none',
  };
};

export const discoverJavaFiles = (projectPath: string, sourceDirectories: readonly string[]): string[] => {
  const files: string[] = [];
  const resolvedPath = resolve(projectPath);

  for (const srcDir of sourceDirectories) {
    const fullSrcDir = resolve(resolvedPath, srcDir);
    if (!existsSync(fullSrcDir)) continue;

    const walk = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip common non-source directories
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'build' || entry.name === 'target') {
            continue;
          }
          walk(entryPath);
        } else if (entry.name.endsWith('.java')) {
          files.push(entryPath);
        }
      }
    };

    walk(fullSrcDir);
  }

  return files.sort();
};
