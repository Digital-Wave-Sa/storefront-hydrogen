import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    /**
     * Tracking (GTM and the tags it loads).
     *
     * GTM was allowed but everything it loads was not, so the browser refused
     * Meta, TikTok, Snap and Google Ads and the pixels never fired.
     *
     * 'strict-dynamic' lets a script this page trusts (every script here
     * carries the nonce, and the rest are added by those scripts) load further
     * scripts -- so GTM's tags, including Custom HTML ones and tags added to
     * the container later, run without listing each script host. Browsers
     * that support it ignore the host list below for scripts; it stays for
     * the few that do not. Where the tags SEND data (images, requests,
     * frames) is not covered by it, so those hosts are listed further down.
     */
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'",
      "'strict-dynamic'",
      'https://maps.googleapis.com', 
      'https://cdn.shopify.com',
      'https://www.googletagmanager.com',
      'https://tagassistant.google.com',
      'https://www.google-analytics.com',
      'https://ssl.google-analytics.com',
      // Meta Pixel, TikTok, Snap, Google Ads (loaded by GTM)
      'https://connect.facebook.net',
      'https://analytics.tiktok.com',
      'https://*.tiktok.com',
      'https://sc-static.net',
      'https://www.googleadservices.com',
      'https://googleads.g.doubleclick.net',
      'https://www.google.com',
    ],
    frameSrc: [
      "'self'", 
      'https://www.google.com', 
      'https://maps.google.com',
      'https://www.googletagmanager.com',
      'https://tagassistant.google.com',
      // Tracking tags (Google Ads, Meta)
      'https://td.doubleclick.net',
      'https://*.doubleclick.net',
      'https://www.facebook.com',
    ],
    imgSrc: [
      "'self'", 
      'https://cdn.shopify.com', 
      'https://shopify.com', 
      'https://saadeddin.com', 
      'https://cdn.tamara.co', 
      'https://maps.googleapis.com', 
      'https://maps.gstatic.com', 
      'https://file.lola.do', 
      'https://images.unsplash.com',
      'https://ui-avatars.com',
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      // Tracking pixels (Meta, TikTok, Snap, Google Ads -- Google Ads also
      // reports to the country Google domain, google.com.sa here)
      'https://www.facebook.com',
      'https://analytics.tiktok.com',
      'https://*.tiktok.com',
      'https://tr.snapchat.com',
      'https://*.doubleclick.net',
      'https://www.googleadservices.com',
      'https://www.google.com',
      'https://www.google.com.sa',
      'https://*.googlesyndication.com',
      'data:'
    ],
    connectSrc: [
      "'self'", 
      'https://sdgc.saadeddin.top',
      'https://api.saadeddin.top',
      'https://*.saadeddin.top',
      'https://maps.googleapis.com', 
      '*.google.com', 
      'https://*.google.com', 
      'https://cdn.tamara.co', 
      'https://raw.githubusercontent.com',
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      // Tracking tags (Meta, TikTok, Snap, Google Ads)
      'https://www.facebook.com',
      'https://connect.facebook.net',
      'https://analytics.tiktok.com',
      'https://*.tiktok.com',
      'https://tr.snapchat.com',
      'https://*.snapchat.com',
      'https://*.doubleclick.net',
      'https://www.googleadservices.com',
      'https://www.google.com.sa',
      'https://*.googlesyndication.com',
    ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com', 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://cdn.shopify.com', 'https://fonts.gstatic.com', 'data:'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
