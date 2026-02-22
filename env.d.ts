/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';


// env.d.ts
declare module 'virtual:react-router/server-build' {
  export const routes: any;
  export const assets: any;
  export const entry: any;
  export const future: any;
  export const publicPath: string;
}