import * as build from 'virtual:react-router/server-build';
// @ts-ignore
import { createRequestHandler, storefrontRedirect } from '@shopify/hydrogen';
import { createHydrogenRouterContext } from '~/lib/context';

export default async function handler(request: Request): Promise<Response> {
  try {
    // Vercel Node.js runtime doesn't have a native ExecutionContext like
    // Cloudflare Workers. We provide a compatible shim here.
    const executionContext: ExecutionContext = {
      waitUntil: (promise: Promise<unknown>) => {
        // On Vercel, we can't defer work past the response, so we
        // fire-and-forget but swallow errors to avoid crashing the handler.
        promise.catch((err) => console.error('[waitUntil error]', err));
      },
      passThroughOnException: (): never => {
        throw new Error('passThroughOnException is not supported on Vercel.');
      },
      props: {},
    };

    const hydrogenContext = await createHydrogenRouterContext(
      request,
      process.env as any,
      executionContext,
    );

    const handleRequest = createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

    if (hydrogenContext.session?.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      return storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return new Response('An unexpected error occurred', { status: 500 });
  }
}