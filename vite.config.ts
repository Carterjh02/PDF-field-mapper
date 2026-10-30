import { defineConfig } from 'vite'

import path from 'node:path'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import electron from 'vite-plugin-electron/simple'

/**
 * Vite configuration for PDF Field Mapper.
 *
 * Responsibilities:
 * - React development
 * - Tailwind CSS processing
 * - Electron main process
 * - Electron preload process
 * - Development server integration
 */

export default defineConfig({
  plugins: [
    // React support.
    react(),

    // Tailwind CSS 4 integration.
    tailwindcss(),

    // Electron integration.
    electron({
      main: {
        entry: 'electron/main.ts',
      },

      preload: {
        input: path.join(
          __dirname,
          'electron/preload.ts'
        ),
      },

      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
    }),
  ],
})