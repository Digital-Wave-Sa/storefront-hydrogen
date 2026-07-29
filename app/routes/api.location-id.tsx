import { type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    try {
        const formData = await request.formData();
        const locationId = formData.get('locationId');
        const branchName = formData.get('branchName');
        const fulfillmentType = formData.get('fulfillmentType');
        const addressName = formData.get('addressName');
        const manualLocationSelection = formData.get('manualLocationSelection');
        const attributesStr = formData.get('attributes');
        const buyerIdentityStr = formData.get('buyerIdentity');
        const axStoreId = formData.get('axStoreId') || formData.get('ax_store_id');
        const customBranchId = formData.get('customBranchId') || formData.get('branch_id');
        
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
        if (typeof axStoreId === 'string') {
            context.session.set('selectedAxStoreId', axStoreId);
        }
        if (typeof customBranchId === 'string') {
            context.session.set('selectedCustomBranchId', customBranchId);
        }

        try {
            const customerAccessToken = await context.session.get('customerAccessToken');

            // Sync Cart Attributes if cart exists
            if (context.cart) {
                let attributes = [] as any[];
                if (typeof attributesStr === 'string') {
                    try {
                        attributes = JSON.parse(attributesStr) as any[];
                    } catch (e) {}
                }
                
                const sessionAxStoreId = (typeof axStoreId === 'string' ? axStoreId : (await context.session.get('selectedAxStoreId'))) || '';
                const sessionCustomBranchId = (typeof customBranchId === 'string' ? customBranchId : (await context.session.get('selectedCustomBranchId'))) || '';

                if (attributes.length === 0) {
                    attributes = [
                        { key: 'Branch', value: (typeof branchName === 'string' ? branchName : (await context.session.get('selectedLocationName'))) || '' },
                        { key: 'Branch ID', value: (typeof locationId === 'string' ? locationId : (await context.session.get('selectedLocationId'))) || '' },
                        { key: 'Fulfillment Type', value: typeof fulfillmentType === 'string' ? (fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery') : 'Pickup' }
                    ];
                }

                if (sessionCustomBranchId) {
                    if (!attributes.find((a: any) => a.key === 'custom.branch_id')) {
                        attributes.push({ key: 'custom.branch_id', value: sessionCustomBranchId });
                    }
                    if (!attributes.find((a: any) => a.key === 'branch_id')) {
                        attributes.push({ key: 'branch_id', value: sessionCustomBranchId });
                    }
                }
                if (sessionAxStoreId) {
                    if (!attributes.find((a: any) => a.key === 'custom.ax_store_id')) {
                        attributes.push({ key: 'custom.ax_store_id', value: sessionAxStoreId });
                    }
                    if (!attributes.find((a: any) => a.key === 'ax_store_id')) {
                        attributes.push({ key: 'ax_store_id', value: sessionAxStoreId });
                    }
                    if (!attributes.find((a: any) => a.key === 'AX Store ID')) {
                        attributes.push({ key: 'AX Store ID', value: sessionAxStoreId });
                    }
                }

                if (typeof context.cart.updateAttributes === 'function') {
                    await context.cart.updateAttributes(attributes);
                }

                // Sync Buyer Identity if needed
                if (customerAccessToken) {
                    const tokenStr = typeof customerAccessToken === 'string' ? customerAccessToken : customerAccessToken?.accessToken;
                    
                    let buyerIdentity: any = undefined;
                    if (typeof buyerIdentityStr === 'string') {
                        try {
                            buyerIdentity = JSON.parse(buyerIdentityStr);
                            if (buyerIdentity) {
                                buyerIdentity.customerAccessToken = tokenStr;
                            }
                        } catch (e) {}
                    }
                    
                    if (!buyerIdentity && typeof fulfillmentType === 'string' && fulfillmentType === 'delivery' && typeof addressName === 'string') {
                        const CUSTOMER_ADDRESSES_QUERY = `#graphql
                          query CustomerAddressesForLocationId($customerAccessToken: String!) {
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

                    if (typeof context.cart.updateBuyerIdentity === 'function') {
                        if (buyerIdentity) {
                            await context.cart.updateBuyerIdentity(buyerIdentity);
                        } else {
                            await context.cart.updateBuyerIdentity({ customerAccessToken: tokenStr });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[LOCATION API] Cart sync failed:', e);
        }

        const cookieHeader = await context.session.commit();
        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookieHeader,
            },
        });
    } catch (error: any) {
        console.error('[LOCATION API] Global action error:', error);
        return new Response(JSON.stringify({ success: false, error: error?.message || 'Server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
