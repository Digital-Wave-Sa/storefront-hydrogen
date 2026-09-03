/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
    PUBLIC_CHECKOUT_DOMAIN: string;
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: string;
    /**
     * Both spellings are declared because the codebase reads the plural
     * (account.feedback-analytics.tsx) while only the singular was ever typed.
     * Whichever one your .env actually carries, the other reads as undefined
     * and the caller falls through to its own admin token — working, but not
     * through the path anyone intended. Worth settling on one.
     */
    SHOPIFY_ADMIN_API_ACCESS_TOKENS?: string;
    /** Admin API host; takes priority over SHOPIFY_SHOP. */
    SHOPIFY_ADMIN_DOMAIN?: string;
    PUBLIC_SHOPIFY_STORE_DOMAIN?: string;
    /** Sender identity for outbound mail; defaults to crm@saadeddin.com. */
    SMTP_USER?: string;
    /** Where contact-form submissions are delivered. */
    CONTACT_RECEIVER_EMAIL?: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FACEBOOK_CLIENT_ID: string;
    FACEBOOK_CLIENT_SECRET: string;
    APPLE_CLIENT_ID: string;
    PUBLIC_GOOGLE_MAPS_KEY: string;
    PUBLIC_GOOGLE_PLACES_KEY: string;
    PUBLIC_GOOGLE_GEOCODING_KEY: string;
    PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY: string;
    PUBLIC_GTM_ID: string;
    PUBLIC_GA4_MEASUREMENT_ID: string;
    PUBLIC_SMILE_CHANNEL_KEY: string;
    SHOPIFY_SHOP: string;
    MIDDLEWARE_URL: string;
    /** Store credit service — the authoritative wallet balance. */
    STORE_CREDIT_API_URL?: string;
    CUSTOM_API_URL: string;
    SDLP_APP_URL?: string;
  }
}
