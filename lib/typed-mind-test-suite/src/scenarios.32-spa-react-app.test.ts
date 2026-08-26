import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-32-spa-react-app', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-32-spa-react-app.tmd';

  it('should validate SPA React application architecture', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    const parsed = checker.parse(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should have the main program
    assert.equal(parsed.entities.has('EcommerceApp'), true);
    const app = parsed.entities.get('EcommerceApp');
    assert.equal(app?.type, 'Program');
    if (app?.type === 'Program') {
      assert.equal(app.entry, 'MainFile');
      assert.equal(app.version, '2.1.0');
    }

    // Should have core files
    assert.equal(parsed.entities.has('MainFile'), true);
    assert.equal(parsed.entities.has('AppFile'), true);
    assert.equal(parsed.entities.has('RouterFile'), true);
    assert.equal(parsed.entities.has('StoreFile'), true);

    // Should have Redux slices
    assert.equal(parsed.entities.has('AuthSliceFile'), true);
    assert.equal(parsed.entities.has('CartSliceFile'), true);
    assert.equal(parsed.entities.has('ProductSliceFile'), true);
    assert.equal(parsed.entities.has('OrderSliceFile'), true);

    // Should have UI components
    assert.equal(parsed.entities.has('App'), true);
    assert.equal(parsed.entities.has('Header'), true);
    assert.equal(parsed.entities.has('Footer'), true);
    assert.equal(parsed.entities.has('Router'), true);

    // Should have page components
    assert.equal(parsed.entities.has('HomePage'), true);
    assert.equal(parsed.entities.has('ProductListPage'), true);
    assert.equal(parsed.entities.has('ProductDetailPage'), true);
    assert.equal(parsed.entities.has('CartPage'), true);
    assert.equal(parsed.entities.has('CheckoutPage'), true);

    // Should have environment variables
    assert.equal(parsed.entities.has('API_URL'), true);
    assert.equal(parsed.entities.has('STRIPE_PUBLIC_KEY'), true);
    assert.equal(parsed.entities.has('NODE_ENV'), true);

    // Check environment variable types
    const apiUrl = parsed.entities.get('API_URL');
    assert.equal(apiUrl?.type, 'RunParameter');
    if (apiUrl?.type === 'RunParameter') {
      assert.equal(apiUrl.paramType, 'env');
      assert.equal(apiUrl.required, true);
    }

    const nodeEnv = parsed.entities.get('NODE_ENV');
    assert.equal(nodeEnv?.type, 'RunParameter');
    if (nodeEnv?.type === 'RunParameter') {
      assert.equal(nodeEnv.paramType, 'env');
      assert.equal(nodeEnv.defaultValue, 'development');
    }

    // Should have service functions
    assert.equal(parsed.entities.has('login'), true);
    assert.equal(parsed.entities.has('addToCart'), true);
    assert.equal(parsed.entities.has('fetchProducts'), true);
    assert.equal(parsed.entities.has('createOrder'), true);

    // Should have DTOs
    assert.equal(parsed.entities.has('LoginDTO'), true);
    assert.equal(parsed.entities.has('ProductDTO'), true);
    assert.equal(parsed.entities.has('OrderDTO'), true);

    // Check that key functions consume environment variables
    const loginFunc = parsed.entities.get('login');
    assert.equal(loginFunc?.type, 'Function');
    if (loginFunc?.type === 'Function') {
      assert.ok(loginFunc.consumes.includes('API_URL'));
      assert.ok(loginFunc.consumes.includes('NODE_ENV'));
    }

    const createOrderFunc = parsed.entities.get('createOrder');
    assert.equal(createOrderFunc?.type, 'Function');
    if (createOrderFunc?.type === 'Function') {
      assert.ok(createOrderFunc.consumes.includes('API_URL'));
      assert.ok(createOrderFunc.consumes.includes('STRIPE_PUBLIC_KEY'));
    }

    // Should have external dependencies
    assert.equal(parsed.dependencies.has('react'), true);
    assert.equal(parsed.dependencies.has('react-dom'), true);
    assert.equal(parsed.dependencies.has('@reduxjs/toolkit'), true);
    assert.equal(parsed.dependencies.has('axios'), true);

    // Verify entity count is reasonable for a full SPA
    assert.ok(parsed.entities.size > 80);
  });
});
