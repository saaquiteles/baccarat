import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from https://saaquiteles.github.io/baccarat/ (a GitHub Pages
  // project site, not a custom domain or user/org root page) - asset URLs
  // must be rooted at the repo name, not the domain root.
  base: '/baccarat/',
})
