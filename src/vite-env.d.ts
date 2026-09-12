/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the voice proxy (see server/). Falls back to relative /api when unset. */
  readonly VITE_VOICE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
