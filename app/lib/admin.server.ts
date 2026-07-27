/**
 * Robust Admin API wrapper for server-side GraphQL queries/mutations.
 */
export async function adminApiQuery(
  domain: string,
  token: string,
  query: string,
  variables?: any
) {
  try {
    const response = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { errors: [{ message: `HTTP Error ${response.status}: ${errorText}` }] };
    }

    return response.json();
  } catch (error: any) {
    return { errors: [{ message: error.message }] };
  }
}

