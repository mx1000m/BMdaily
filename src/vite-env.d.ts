/// <reference types="vite/client" />

declare module 'https://esm.sh/@farcaster/miniapp-sdk' {
  export const sdk: any;
}

// Minimal shims for Netlify modules to satisfy local TS
declare module '@netlify/functions' {
  export interface HandlerEvent { httpMethod: string; body?: string | null }
  export interface HandlerResponse { statusCode: number; body: string }
  export type Handler = (event: HandlerEvent) => Promise<HandlerResponse> | HandlerResponse;
}
declare module '@netlify/blobs' {
  export function getStore(opts: { name: string }): {
    setJSON: (key: string, value: unknown) => Promise<void>;
    getJSON: <T = any>(key: string) => Promise<T | null>;
    delete: (key: string) => Promise<void>;
  };
}
