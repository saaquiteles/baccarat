import { defineConfig } from 'vitest/config';

// Separate from vite.config.js on purpose: the game engine under src/game is
// plain, framework-agnostic JS that runs headlessly under Node (no browser,
// no DOM, no React). Tests use the 'node' environment and explicit
// describe/it/expect imports rather than injected globals.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.js'],
  },
});
