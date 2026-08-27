import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return `${__dirname}/src/assets/${filename}`
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const sentryRelease = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || ''
  const uploadSentrySourceMaps = Boolean(
    process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  )

  return ({
  server: {
    // Bind one dual-stack listener so a second Vite process cannot silently
    // reuse the same port on the other localhost address family.
    host: '::',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    ...(uploadSentrySourceMaps ? [sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: sentryRelease ? { name: sentryRelease } : undefined,
      sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      silent: true,
    })] : []),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': `${__dirname}/src`,
    },
  },

  // The Vercel functions load the generated SEO server bundle dynamically.
  // Keep it self-contained so runtime file tracing does not miss React SSR.
  ssr: {
    noExternal: true,
  },

  // Keep diagnostics available while developing without shipping API errors,
  // identifiers, or verbose SignalR traces to production browsers.
  esbuild: mode === 'production'
    ? { drop: ['console', 'debugger'] }
    : undefined,
  build: {
    // Prevent orphaned hashed chunks from older builds being deployed.
    emptyOutDir: true,
    // Hidden source maps are uploaded to Sentry and then removed from dist.
    sourcemap: uploadSentrySourceMaps ? 'hidden' : false,
  },

  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  })
})
