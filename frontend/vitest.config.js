import { defineConfig } from 'vitest/config';

// Separate from vite.config.js so tests don't load the React compiler plugin.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});
