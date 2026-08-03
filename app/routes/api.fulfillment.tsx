import {data, type ActionFunctionArgs} from 'react-router';

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const fulfillmentType = formData.get('fulfillmentType');
  const locationId = formData.get('locationId');
  const locationName = formData.get('locationName');

  console.log('Fulfillment Action:', {
    fulfillmentType,
    locationId,
    locationName,
  });

  if (typeof fulfillmentType === 'string') {
    context.session.set('fulfillmentType', fulfillmentType);
  }
  if (typeof locationId === 'string') {
    context.session.set('selectedLocationId', locationId);
  }
  if (typeof locationName === 'string') {
    context.session.set('selectedLocationName', locationName);
  }

  return data(
    {success: true},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}
