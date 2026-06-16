import {
  data,
  redirect,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Logout'}];
};

export async function loader() {
  return redirect('/account/login');
}

export async function action({request, context}: ActionFunctionArgs) {
  const {session} = context;
  session.unset('customerAccessToken');

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const headers = new Headers();
  headers.append('Set-Cookie', await session.commit());
  headers.append('Set-Cookie', 'cart=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

  return redirect('/', {
    headers,
  });
}

export default function Logout() {
  return null;
}





