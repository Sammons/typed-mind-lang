import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-36-static-website', () => {
  const scenarioFile = 'scenario-36-static-website.tmd';

  it('should validate static website with build pipeline architecture', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes used for narrowing below come from the same
    // module instance as the entities themselves — `@sammons/typed-mind`'s
    // TypedMind facade resolves through the compiled `dist/` build, a
    // distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parsed = parser.parse(content);
    const entities = parsed.entities;

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Should have the main program
    assert.equal(
      entities.some((entity) => entity.name === 'PortfolioSite'),
      true,
    );
    const app = entities.find((entity) => entity.name === 'PortfolioSite' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(app?.kind, 'Program');
    assert.equal(app?.entry, 'BuildFile');
    assert.equal(app?.version, '1.0.0');

    // Should have build system files
    assert.equal(
      entities.some((entity) => entity.name === 'BuildFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PostCSSConfigFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TailwindConfigFile'),
      true,
    );

    // Should have page files
    assert.equal(
      entities.some((entity) => entity.name === 'HomePageFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'BlogPageFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'BlogPostFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProjectsPageFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AboutPageFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ContactPageFile'),
      true,
    );

    // Should have API routes
    assert.equal(
      entities.some((entity) => entity.name === 'ContactAPIFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'OGImageAPIFile'),
      true,
    );

    // Should have layout files
    assert.equal(
      entities.some((entity) => entity.name === 'RootLayoutFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'HeaderFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FooterFile'),
      true,
    );

    // Should have utility files
    assert.equal(
      entities.some((entity) => entity.name === 'ContentLoaderFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'MDXComponentsFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'UtilsFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'HooksFile'),
      true,
    );

    // Should have UI components
    assert.equal(
      entities.some((entity) => entity.name === 'HomePage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'BlogListPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'BlogPostPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProjectsPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AboutPage'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ContactPage'),
      true,
    );

    // Should have shared components
    assert.equal(
      entities.some((entity) => entity.name === 'Header'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Footer'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Navigation'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ThemeToggle'),
      true,
    );

    // Should have content components
    assert.equal(
      entities.some((entity) => entity.name === 'BlogCard'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProjectCard'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ContactForm'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Newsletter'),
      true,
    );

    // Should have environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'NEXT_PUBLIC_SITE_URL'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'RESEND_API_KEY'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'NODE_VERSION'),
      true,
    );

    // Check environment variable types
    const siteUrl = entities.find((entity) => entity.name === 'NEXT_PUBLIC_SITE_URL' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(siteUrl?.kind, 'RunParameter');
    assert.equal(siteUrl?.paramType, 'env');
    assert.equal(siteUrl?.required, true);

    const nodeVersion = entities.find((entity) => entity.name === 'NODE_VERSION' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(nodeVersion?.kind, 'RunParameter');
    assert.equal(nodeVersion?.paramType, 'runtime');
    assert.equal(nodeVersion?.defaultValue, '20.x');

    // Should have content processing classes
    assert.equal(
      entities.some((entity) => entity.name === 'MDXProcessor'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ImageOptimizer'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'RSSGenerator'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SitemapGenerator'),
      true,
    );

    // Should have key functions
    assert.equal(
      entities.some((entity) => entity.name === 'build'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'getAllPosts'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'getPostBySlug'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'getProjects'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'generateRSSFeed'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'generateSitemap'),
      true,
    );

    // Should have DTOs
    assert.equal(
      entities.some((entity) => entity.name === 'Post'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PostParams'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'MDXSource'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ProcessedMDX'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ContactRequest'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ContactResponse'),
      true,
    );

    // Check that key functions consume environment variables
    const buildFunc = entities.find((entity) => entity.name === 'build' && entity instanceof FunctionNode) as FunctionNode | undefined;
    assert.equal(buildFunc?.kind, 'Function');
    assert.ok(buildFunc?.consumes?.includes('NODE_VERSION'));
    assert.ok(buildFunc?.consumes?.includes('DEPLOYMENT_TARGET'));

    const rssFunc = entities.find((entity) => entity.name === 'generateRSSFeed' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(rssFunc?.kind, 'Function');
    assert.ok(rssFunc?.consumes?.includes('NEXT_PUBLIC_SITE_URL'));

    const postFunc = entities.find((entity) => entity.name === 'POST' && entity instanceof FunctionNode) as FunctionNode | undefined;
    assert.equal(postFunc?.kind, 'Function');
    assert.ok(postFunc?.consumes?.includes('RESEND_API_KEY'));

    // Should have external dependencies. The legacy `ParseResult.dependencies`
    // Map (DSLChecker-internal call/import graph) keyed every entity by name
    // regardless of kind (index.ts buildDependencyGraph), so `.has(name)` was
    // equivalent to entity presence — checked directly here on the new
    // entity list.
    assert.equal(
      entities.some((entity) => entity.name === 'next'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'react'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'tailwindcss'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === '@mdx-js/loader'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'sharp'),
      true,
    );

    // Should have assets
    assert.equal(
      entities.some((entity) => entity.name === 'logo'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'favicon'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'fontInter'),
      true,
    );

    // Verify entity count is reasonable for a static website
    assert.ok(entities.length > 100);
  });
});
