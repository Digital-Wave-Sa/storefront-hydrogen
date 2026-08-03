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
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'",
      'https://maps.googleapis.com', 
      'https://cdn.shopify.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://ssl.google-analytics.com'
    ],
    frameSrc: [
      "'self'", 
      'https://www.google.com', 
      'https://maps.google.com',
      'https://www.googletagmanager.com'
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
      'data:'
    ],
    connectSrc: [
      "'self'", 
      'https://maps.googleapis.com', 
      '*.google.com', 
      'https://*.google.com', 
      'https://cdn.tamara.co', 
      'https://raw.githubusercontent.com',
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com'
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
