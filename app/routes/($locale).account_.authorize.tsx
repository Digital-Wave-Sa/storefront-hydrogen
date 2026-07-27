// @ts-ignore - route types generated during build
import type {Route} from './+types/account_.authorize';

export async function loader({context}: Route.LoaderFunctionArgs) {
  return context.customerAccount.authorize();
}





