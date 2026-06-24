/**
 * Startup Smoke Test
 *
 * Verifies that all route and middleware modules required during server
 * startup can be loaded without throwing errors. This catches regressions
 * in:
 *   - Missing modules (MODULE_NOT_FOUND)
 *   - Wrong import patterns (e.g. object passed to router.use())
 *   - Wrong relative paths in requires
 *   - Destructuring mismatches
 *
 * Run: npx jest tests/startup.test.js
 */

const path = require('path');

// ── Route modules loaded by src/index.js during startup ──

const ROUTE_MODULES = [
  // Middleware (loaded before routes in index.js)
  { name: 'auth middleware',       requirePath: '../src/middleware/auth' },
  { name: 'cors middleware',        requirePath: '../src/middleware/cors' },
  { name: 'rbac middleware',        requirePath: '../src/middleware/rbac' },
  { name: 'abac middleware',        requirePath: '../src/middleware/abac' },
  { name: 'error handler',          requirePath: '../src/middleware/errorHandler' },
  { name: 'validation middleware',  requirePath: '../src/middleware/validation' },
  { name: 'analytics tracking',     requirePath: '../src/middleware/analytics/tracking' },

  // Route files
  { name: 'auth routes',            requirePath: '../src/routes/auth' },
  { name: 'health routes',          requirePath: '../src/routes/health' },
  { name: 'whatsapp routes',        requirePath: '../src/routes/whatsapp' },
  { name: 'supplierTrust routes',   requirePath: '../src/routes/supplierTrust' },
  { name: 'customsEngine routes',   requirePath: '../src/routes/customsEngine' },
  { name: 'contacts routes',        requirePath: '../src/routes/contacts' },
  { name: 'accounts routes',        requirePath: '../src/routes/accounts' },
  { name: 'sequences routes',       requirePath: '../src/routes/sequences' },
  { name: 'enrollments routes',     requirePath: '../src/routes/enrollments' },
  { name: 'teams routes',           requirePath: '../src/routes/teams' },
  { name: 'admin routes',           requirePath: '../src/routes/admin' },
  { name: 'agents routes',          requirePath: '../src/routes/agents' },
  { name: 'analytics routes',       requirePath: '../src/routes/analytics/index' },

  // v1 API routes (loaded through src/api/v1/routes/index.js)
  { name: 'v1 API routes',          requirePath: '../src/api/v1/routes/index' },
  { name: 'ers controller',         requirePath: '../src/api/v1/controllers/ers/ersController' },
  { name: 'korean compliance cntrl', requirePath: '../src/api/v1/controllers/compliance/koreanComplianceController' },
  { name: 'korean market analysis',  requirePath: '../src/api/v1/controllers/marketAnalysis/koreanMarketAnalysisController' },

  // Services that were previously missing (stubs)
  { name: 'account service',        requirePath: '../src/services/accountService' },
  { name: 'sequence service',       requirePath: '../src/services/sequenceService' },
];

// ── Test ──

describe('Startup smoke test', () => {
  describe.each(ROUTE_MODULES)('$name', ({ name, requirePath }) => {
    let mod;

    test('loads without error', () => {
      expect(() => {
        mod = require(requirePath);
      }).not.toThrow();
    });

    test('exports a function or router', () => {
      if (!mod) mod = require(requirePath);

      // Express routers are functions (typeof === 'function').
      // Some modules export an object with named exports — that's also valid
      // (e.g. errorHandler exports { notFoundHandler, globalErrorHandler }).
      // The key check: it must be usable by Express in SOME form.
      const type = typeof mod;
      expect([ 'function', 'object' ]).toContain(type);
    });

    test('has no undefined exports when used as object', () => {
      if (!mod) mod = require(requirePath);

      if (typeof mod === 'object' && mod !== null) {
        const values = Object.values(mod);
        const undefinedValues = values.filter((v) => v === undefined);
        expect(undefinedValues).toHaveLength(0);
      }
    });
  });

  // ── Additional sanity checks on key exports ──

  test('auth middleware exports authenticate as a function', () => {
    const auth = require('../src/middleware/auth');
    expect(typeof auth.authenticate).toBe('function');
    expect(typeof auth.scopeToCompany).toBe('function');
  });

  test('rbac middleware exports rbacAuthorize as a function', () => {
    const rbac = require('../src/middleware/rbac');
    expect(typeof rbac.rbacAuthorize).toBe('function');
  });

  test('errorHandler exports notFoundHandler and globalErrorHandler', () => {
    const eh = require('../src/middleware/errorHandler');
    expect(typeof eh.notFoundHandler).toBe('function');
    expect(typeof eh.globalErrorHandler).toBe('function');
    expect(typeof eh.AppError).toBe('function');
  });

  test('route modules export functions usable with app.use()', () => {
    // Express router objects are functions. Verify key route files export
    // a function (not just an object with named exports).
    const routeFiles = [
      '../src/routes/auth',
      '../src/routes/whatsapp',
      '../src/routes/agents',
      '../src/routes/health',
      '../src/api/v1/routes/index',
    ];

    for (const file of routeFiles) {
      const mod = require(file);
      expect(typeof mod).toBe('function');
    }
  });
});
