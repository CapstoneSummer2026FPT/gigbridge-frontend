/// <reference types="vite/client" />

declare module '*.mp4' {
  const src: string;
  export default src;
}

// Allow CSS side-effect imports without type errors (TS2882)
declare module '*.css' {}


interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV: string;
  readonly VITE_DEBUG?: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google: any;
  }
}
