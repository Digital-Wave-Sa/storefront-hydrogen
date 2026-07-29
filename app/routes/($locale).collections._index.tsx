import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const isEn = params.locale === 'en';
  return redirect(isEn ? '/en/collections/all' : '/collections/all');
}

export default function Collections() {
  return null;
}
viousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

