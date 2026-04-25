/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    PUBLIC_GOOGLE_MAPS_KEY: string;
    PUBLIC_GOOGLE_PLACES_KEY: string;
    PUBLIC_GOOGLE_GEOCODING_KEY: string;
    PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY: string;
  }
}
