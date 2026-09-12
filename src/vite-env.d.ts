/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the server/ proxy (voice + hints). Falls back to relative /api when unset. */
  readonly VITE_API_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
