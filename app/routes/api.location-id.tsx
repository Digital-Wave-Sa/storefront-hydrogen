import { data, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const locationId = formData.get('locationId');
    const branchName = formData.get('branchName');

    const fulfillmentType = formData.get('fulfillmentType');

    if (typeof fulfillmentType === 'string') {
        context.session.set('fulfillmentType', fulfillmentType);
    }
    if (typeof locationId === 'string') {
        context.session.set('selectedLocationId', locationId);
    }
    if (typeof branchName === 'string') {
        context.session.set('selectedLocationName', branchName);
    }

    return data({ success: true }, {
        headers: {
            'Set-Cookie': await context.session.commit(),
        },
    });
}



