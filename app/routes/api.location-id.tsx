import { data, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const locationId = formData.get('locationId');
    const branchName = formData.get('branchName');
    const fulfillmentType = formData.get('fulfillmentType');
    const addressName = formData.get('addressName');
    const manualLocationSelection = formData.get('manualLocationSelection');
    const attributesStr = formData.get('attributes');
    const buyerIdentityStr = formData.get('buyerIdentity');
    
    if (typeof fulfillmentType === 'string') {
        context.session.set('fulfillmentType', fulfillmentType);
    }
    if (typeof locationId === 'string') {
        context.session.set('selectedLocationId', locationId);
    }
    if (typeof branchName === 'string') {
        context.session.set('selectedLocationName', branchName);
    }
    if (typeof addressName === 'string') {
        context.session.set('selectedAddressName', addressName);
    }
    if (typeof manualLocationSelection === 'string') {
        context.session.set('manualLocationSelection', manualLocationSelection);
    }


    try {
        const customerAccessToken = await context.session.get('customerAccessToken');

        // Sync Cart Attributes
        let attributes = [];
        if (typeof attributesStr === 'string') {
            try {
                attributes = JSON.parse(attributesStr);
            } catch (e) {}
        }
        
        if (attributes.length === 0) {
            attributes = [
                { key: 'Branch', value: (typeof branchName === 'string' ? branchName : (await context.session.get('selectedLocationName'))) || '' },
                { key: 'Branch ID', value: (typeof locationId === 'string' ? locationId : (await context.session.get('selectedLocationId'))) || '' },
                { key: 'Fulfillment Type', value: typeof fulfillmentType === 'string' ? (fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery') : 'Pickup' }
            ];
        }
        await context.cart.updateAttributes(attributes);

        // Sync Buyer Identity if needed
        if (customerAccessToken) {
            const tokenStr = typeof customerAccessToken === 'string' ? customerAccessToken : customerAccessToken?.accessToken;
            
            let buyerIdentity: any = undefined;
            if (typeof buyerIdentityStr === 'string') {
                try {
                    buyerIdentity = JSON.parse(buyerIdentityStr);
                    // Ensure the token is set on the parsed identity
                    if (buyerIdentity) {
                        buyerIdentity.customerAccessToken = tokenStr;
                    }
                } catch (e) {}
            }
            
            if (!buyerIdentity && typeof fulfillmentType === 'string' && fulfillmentType === 'delivery' && typeof addressName === 'string') {
                const CUSTOMER_ADDRESSES_QUERY = `#graphql
                  query CustomerAddresses($customerAccessToken: String!) {
                    customer(customerAccessToken: $customerAccessToken) {
                      addresses(first: 250) {
                        nodes {
                          id
                          firstName
                          lastName
                          address1
                          address2
                          city
                          country
                          phone
                        }
                      }
                    }
                  }
                `;
                const res = await context.storefront.query(CUSTOMER_ADDRESSES_QUERY, {
                    variables: { customerAccessToken: tokenStr },
                    cache: context.storefront.CacheNone(),
                });
                const customer = res.customer;
                
                if (customer) {
                    const selectedAddr = customer.addresses?.nodes?.find((a: any) => 
                        `${a.firstName} ${a.lastName}` === addressName || 
                        a.address1 === addressName
                    );
                    
                    if (selectedAddr) {
                        buyerIdentity = {
                            customerAccessToken: tokenStr,
                            deliveryAddressPreferences: [{
                                deliveryAddress: {
                                    address1: selectedAddr.address1,
                                    address2: selectedAddr.address2,
                                    city: selectedAddr.city,
                                    country: selectedAddr.country || 'SA',
                                    firstName: selectedAddr.firstName,
                                    lastName: selectedAddr.lastName,
                                    phone: selectedAddr.phone
                                }
                            }]
                        };
                    }
                }
            }

            if (buyerIdentity) {
                await context.cart.updateBuyerIdentity(buyerIdentity);
            } else {
                await context.cart.updateBuyerIdentity({ customerAccessToken: tokenStr });
            }
        }
    } catch (e) {
        console.error('[LOCATION API] Cart sync failed:', e);
    }

    return data({ success: true }, {
        headers: {
            'Set-Cookie': await context.session.commit(),
        },
    });
}



