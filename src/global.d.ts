// Allow CSS side-effect imports across the project without TS2882 errors.
// This is intentional — Vite handles CSS imports at build time.
declare module '*.css' {}
