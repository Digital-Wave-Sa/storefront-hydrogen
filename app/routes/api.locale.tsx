import { redirect, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const locale = formData.get('locale');
    const returnTo = formData.get('returnTo') || '/';

    if (locale === 'en' || locale === 'ar') {
        context.session.set('locale', locale);
    }

    return redirect(returnTo as string, {
        headers: {
            'Set-Cookie': await context.session.commit(),
        },
    });
}



