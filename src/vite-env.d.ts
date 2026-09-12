/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the server/ proxy (voice + hints). Falls back to relative /api when unset. */
  readonly VITE_API_ENDPOINT?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
