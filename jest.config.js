// Jest Configuration for SokogateOS
// Excludes .worktrees/ to avoid duplicate test discovery from git worktrees
// See: scripts/fanout-worktrees.js for worktree management

module.exports = {
  // Root directory is the project root
  rootDir: '.',

  // Only run tests from the main tests/ directory, not from .worktrees/
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/tests/**/*.test.jsx'],

  // Explicitly ignore worktree directories
  testPathIgnorePatterns: ['/node_modules/', '/\\.worktrees/', '/dist/', '/coverage/'],

  // Load env vars from .env.development before any modules
  setupFiles: ['<rootDir>/tests/setup.js'],

  // Module resolution
  moduleDirectories: ['node_modules', 'src'],

  // Test environment
  testEnvironment: 'node',

  // Coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/.worktrees/**',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],

  // Clear mocks between tests by default
  clearMocks: true,

  // Verbose output for CI
  verbose: process.env.CI === 'true',
};
