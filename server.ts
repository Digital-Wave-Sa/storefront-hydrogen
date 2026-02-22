import * as build from 'virtual:react-router/server-build';
// @ts-ignore
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';

export default async function handler(request: Request): Promise<Response> {
  try {
    const hydrogenContext = await createHydrogenRouterContext(
      request,
      process.env as any,
      {} as any
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
        await hydrogenContext.session.commit()
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
    return new Response('An unexpected error occurred', {status: 500});
  }
}