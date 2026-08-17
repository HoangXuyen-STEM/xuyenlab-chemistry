// Vitest runs test files directly in Node/jsdom, not through Next.js's
// bundler, so the real `server-only` package (which throws unless imported
// through Next's server module graph) cannot be used as-is in tests.
// This no-op stub is aliased to `server-only` in vitest.config.mts so files
// that import it for the client/server boundary guard still type-check and
// run under Vitest.
export {};
