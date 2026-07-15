// ──────────────────────────────────────────────
// SokogateOS — Vercel Serverless Entry Point
// ──────────────────────────────────────────────
//
// This file imports the fully configured Express app from src/app.js
// and exports it for Vercel's @vercel/node runtime.
//
// All middleware and routes are set up at module load time in src/app.js.
// Async service initialization (DB, Kafka, agents, etc.) is handled
// lazily — services initialize on first request and cache in the V8
// global scope across warm invocations.
//
// Static frontend assets are served from frontend/dist/ (built during
// Vercel's build step).
//
// ──────────────────────────────────────────────

const app = require('../src/app');

// Vercel requires the Express app as the default export.
// The @vercel/node runtime wraps it into a serverless function
// that handles each incoming HTTP request.
module.exports = app;
