import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from https://saaquiteles.github.io/baccarat/ (a GitHub Pages
  // project site, not a custom domain or user/org root page) - asset URLs
  // must be rooted at the repo name, not the domain root.
  base: '/baccarat/',
  build: {
    // The production bundle used to be a single ~1.4 MB unsplit chunk
    // (flagged on every build). The real fix lives in src/App.jsx:
    // GameScreen - the only consumer of three.js/React Three
    // Fiber/drei/@react-three/postprocessing/GSAP - is now behind a
    // React.lazy()/dynamic import(), so none of that ~1.2 MB payload blocks
    // the initial Loading/Menu/Settings paint; it's fetched only once the
    // player reaches (or is about to reach, via the idle-time prefetch in
    // App.jsx) the game screen.
    //
    // A manualChunks split of that payload into per-library vendor chunks
    // (three / r3f+drei+postprocessing / gsap) was tried and reverted: it
    // caused rolldown (Vite 8's default bundler) to place react's own
    // module in the same physical chunk as the huge r3f vendor bucket
    // (react-reconciler, an @react-three/fiber dependency, also needs
    // react's CJS internals, and rolldown's chunk-merging collapsed the
    // two rather than respecting the separate manual chunk names) - which
    // then forced the *entry* chunk to eagerly, synchronously import that
    // entire ~1.1 MB chunk just to get React out of it (verified via `vite
    // build --manifest`: index.html's `imports` included the vendor chunk
    // even though GameScreen's dynamic import was never triggered). Vite's
    // own default automatic chunking (no manualChunks at all) correctly
    // keeps react/react-dom bundled with the always-needed entry chunk and
    // leaves the entire 3D/animation stack as a pure async dependency of
    // GameScreen - exactly what's wanted here. If a future dependency
    // caching need justifies revisiting per-library vendor chunks, verify
    // with `vite build --manifest` that the entry chunk's `imports` array
    // stays empty (no forced eager edge into whatever chunk holds react).
    chunkSizeWarningLimit: 1300,
  },
})
