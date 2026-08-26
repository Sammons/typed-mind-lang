import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-36-static-website', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-36-static-website.tmd';

  it('should validate static website with build pipeline architecture', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    const parsed = checker.parse(content);
    
    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok((result.errors.length) > (0));
    
    // Should have the main program
    assert.equal(parsed.entities.has('PortfolioSite'), true);
    const app = parsed.entities.get('PortfolioSite');
    assert.equal(app?.type, 'Program');
    if (app?.type === 'Program') {
      assert.equal(app.entry, 'BuildFile');
      assert.equal(app.version, '1.0.0');
    }
    
    // Should have build system files
    assert.equal(parsed.entities.has('BuildFile'), true);
    assert.equal(parsed.entities.has('PostCSSConfigFile'), true);
    assert.equal(parsed.entities.has('TailwindConfigFile'), true);
    
    // Should have page files
    assert.equal(parsed.entities.has('HomePageFile'), true);
    assert.equal(parsed.entities.has('BlogPageFile'), true);
    assert.equal(parsed.entities.has('BlogPostFile'), true);
    assert.equal(parsed.entities.has('ProjectsPageFile'), true);
    assert.equal(parsed.entities.has('AboutPageFile'), true);
    assert.equal(parsed.entities.has('ContactPageFile'), true);
    
    // Should have API routes
    assert.equal(parsed.entities.has('ContactAPIFile'), true);
    assert.equal(parsed.entities.has('OGImageAPIFile'), true);
    
    // Should have layout files
    assert.equal(parsed.entities.has('RootLayoutFile'), true);
    assert.equal(parsed.entities.has('HeaderFile'), true);
    assert.equal(parsed.entities.has('FooterFile'), true);
    
    // Should have utility files
    assert.equal(parsed.entities.has('ContentLoaderFile'), true);
    assert.equal(parsed.entities.has('MDXComponentsFile'), true);
    assert.equal(parsed.entities.has('UtilsFile'), true);
    assert.equal(parsed.entities.has('HooksFile'), true);
    
    // Should have UI components
    assert.equal(parsed.entities.has('HomePage'), true);
    assert.equal(parsed.entities.has('BlogListPage'), true);
    assert.equal(parsed.entities.has('BlogPostPage'), true);
    assert.equal(parsed.entities.has('ProjectsPage'), true);
    assert.equal(parsed.entities.has('AboutPage'), true);
    assert.equal(parsed.entities.has('ContactPage'), true);
    
    // Should have shared components
    assert.equal(parsed.entities.has('Header'), true);
    assert.equal(parsed.entities.has('Footer'), true);
    assert.equal(parsed.entities.has('Navigation'), true);
    assert.equal(parsed.entities.has('ThemeToggle'), true);
    
    // Should have content components
    assert.equal(parsed.entities.has('BlogCard'), true);
    assert.equal(parsed.entities.has('ProjectCard'), true);
    assert.equal(parsed.entities.has('ContactForm'), true);
    assert.equal(parsed.entities.has('Newsletter'), true);
    
    // Should have environment variables
    assert.equal(parsed.entities.has('NEXT_PUBLIC_SITE_URL'), true);
    assert.equal(parsed.entities.has('RESEND_API_KEY'), true);
    assert.equal(parsed.entities.has('NODE_VERSION'), true);
    
    // Check environment variable types
    const siteUrl = parsed.entities.get('NEXT_PUBLIC_SITE_URL');
    assert.equal(siteUrl?.type, 'RunParameter');
    if (siteUrl?.type === 'RunParameter') {
      assert.equal(siteUrl.paramType, 'env');
      assert.equal(siteUrl.required, true);
    }
    
    const nodeVersion = parsed.entities.get('NODE_VERSION');
    assert.equal(nodeVersion?.type, 'RunParameter');
    if (nodeVersion?.type === 'RunParameter') {
      assert.equal(nodeVersion.paramType, 'runtime');
      assert.equal(nodeVersion.defaultValue, '20.x');
    }
    
    // Should have content processing classes
    assert.equal(parsed.entities.has('MDXProcessor'), true);
    assert.equal(parsed.entities.has('ImageOptimizer'), true);
    assert.equal(parsed.entities.has('RSSGenerator'), true);
    assert.equal(parsed.entities.has('SitemapGenerator'), true);
    
    // Should have key functions
    assert.equal(parsed.entities.has('build'), true);
    assert.equal(parsed.entities.has('getAllPosts'), true);
    assert.equal(parsed.entities.has('getPostBySlug'), true);
    assert.equal(parsed.entities.has('getProjects'), true);
    assert.equal(parsed.entities.has('generateRSSFeed'), true);
    assert.equal(parsed.entities.has('generateSitemap'), true);
    
    // Should have DTOs
    assert.equal(parsed.entities.has('Post'), true);
    assert.equal(parsed.entities.has('PostParams'), true);
    assert.equal(parsed.entities.has('MDXSource'), true);
    assert.equal(parsed.entities.has('ProcessedMDX'), true);
    assert.equal(parsed.entities.has('ContactRequest'), true);
    assert.equal(parsed.entities.has('ContactResponse'), true);
    
    // Check that key functions consume environment variables
    const buildFunc = parsed.entities.get('build');
    assert.equal(buildFunc?.type, 'Function');
    if (buildFunc?.type === 'Function') {
      assert.ok((buildFunc.consumes).includes('NODE_VERSION'));
      assert.ok((buildFunc.consumes).includes('DEPLOYMENT_TARGET'));
    }
    
    const rssFunc = parsed.entities.get('generateRSSFeed');
    assert.equal(rssFunc?.type, 'Function');
    if (rssFunc?.type === 'Function') {
      assert.ok((rssFunc.consumes).includes('NEXT_PUBLIC_SITE_URL'));
    }
    
    const postFunc = parsed.entities.get('POST');
    assert.equal(postFunc?.type, 'Function');
    if (postFunc?.type === 'Function') {
      assert.ok((postFunc.consumes).includes('RESEND_API_KEY'));
    }
    
    // Should have external dependencies
    assert.equal(parsed.dependencies.has('next'), true);
    assert.equal(parsed.dependencies.has('react'), true);
    assert.equal(parsed.dependencies.has('tailwindcss'), true);
    assert.equal(parsed.dependencies.has('@mdx-js/loader'), true);
    assert.equal(parsed.dependencies.has('sharp'), true);
    
    // Should have assets
    assert.equal(parsed.entities.has('logo'), true);
    assert.equal(parsed.entities.has('favicon'), true);
    assert.equal(parsed.entities.has('fontInter'), true);
    
    // Verify entity count is reasonable for a static website
    assert.ok((parsed.entities.size) > (100));
  });
});