/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  discountAllocations: Array<{
    discountedAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
  }>;
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<
      StorefrontAPI.Product,
      'handle' | 'title' | 'id' | 'vendor' | 'tags'
    > & {
      collections: {
        nodes: Array<Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'>>;
      };
      availability_date?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
    };
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
    storeAvailability: {
      nodes: Array<
        Pick<StorefrontAPI.StoreAvailability, 'available'> & {
          location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
        }
      >;
    };
  };
  parentRelationship?: StorefrontAPI.Maybe<{
    parent: Pick<StorefrontAPI.CartLine, 'id'>;
  }>;
};

export type CartLineComponentFragment = Pick<
  StorefrontAPI.ComponentizableCartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  discountAllocations: Array<{
    discountedAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
  }>;
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<
      StorefrontAPI.Product,
      'handle' | 'title' | 'id' | 'vendor' | 'tags'
    > & {
      availability_date?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
    };
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
    storeAvailability: {
      nodes: Array<
        Pick<StorefrontAPI.StoreAvailability, 'available'> & {
          location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
        }
      >;
    };
  };
  lineComponents: Array<
    Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
      attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
      cost: {
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        amountPerQuantity: Pick<
          StorefrontAPI.MoneyV2,
          'currencyCode' | 'amount'
        >;
        compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
      };
      discountAllocations: Array<{
        discountedAmount: Pick<
          StorefrontAPI.MoneyV2,
          'currencyCode' | 'amount'
        >;
      }>;
      merchandise: Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'availableForSale' | 'requiresShipping' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        product: Pick<
          StorefrontAPI.Product,
          'handle' | 'title' | 'id' | 'vendor' | 'tags'
        > & {
          collections: {
            nodes: Array<
              Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'>
            >;
          };
          availability_date?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
        };
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      };
      parentRelationship?: StorefrontAPI.Maybe<{
        parent: Pick<StorefrontAPI.CartLine, 'id'>;
      }>;
    }
  >;
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'updatedAt' | 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  appliedGiftCards: Array<
    Pick<StorefrontAPI.AppliedGiftCard, 'id' | 'lastCharacters'> & {
      amountUsed: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    }
  >;
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          discountAllocations: Array<{
            discountedAmount: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
          }>;
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor' | 'tags'
            > & {
              collections: {
                nodes: Array<
                  Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'>
                >;
              };
              availability_date?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
            };
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            storeAvailability: {
              nodes: Array<
                Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                  location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                }
              >;
            };
          };
          parentRelationship?: StorefrontAPI.Maybe<{
            parent: Pick<StorefrontAPI.CartLine, 'id'>;
          }>;
        })
      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          discountAllocations: Array<{
            discountedAmount: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
          }>;
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor' | 'tags'
            > & {
              availability_date?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
            };
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            storeAvailability: {
              nodes: Array<
                Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                  location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                }
              >;
            };
          };
          lineComponents: Array<
            Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
              attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
              cost: {
                totalAmount: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                amountPerQuantity: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
              };
              discountAllocations: Array<{
                discountedAmount: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
              }>;
              merchandise: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'availableForSale' | 'requiresShipping' | 'title'
              > & {
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  'handle' | 'title' | 'id' | 'vendor' | 'tags'
                > & {
                  collections: {
                    nodes: Array<
                      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'>
                    >;
                  };
                  availability_date?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'>
                  >;
                };
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              };
              parentRelationship?: StorefrontAPI.Maybe<{
                parent: Pick<StorefrontAPI.CartLine, 'id'>;
              }>;
            }
          >;
        })
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
  discountAllocations: Array<{
    discountedAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
  }>;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type FooterQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type GetCustomerGidQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerGidQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
};

export type GetReviewsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetReviewsQuery = {
  sfReviews: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  ordReviews: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
};

export type GetShopLocationDiscountsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetShopLocationDiscountsQuery = {
  shop: {
    locationDiscounts?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metafield, 'value'>
    >;
    locationDiscountsAlt?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metafield, 'value'>
    >;
  };
};

export type LocationsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type LocationsQuery = {
  locations: {
    nodes: Array<
      Pick<StorefrontAPI.Location, 'id' | 'name'> & {
        address: Pick<
          StorefrontAPI.LocationAddress,
          | 'address1'
          | 'address2'
          | 'city'
          | 'country'
          | 'latitude'
          | 'longitude'
          | 'phone'
        >;
        city?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        delivery_fee?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        free_delivery_threshold?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        promo_free_delivery_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        promo_free_delivery_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        delivery_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        delivery_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        delivery_hours_from_shift2?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        delivery_hours_to_shift2?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        working_hours_from_shift2?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        working_hours_to_shift2?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        sunday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        sunday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        monday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        monday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        tuesday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        tuesday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        wednesday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        wednesday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        thursday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        thursday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        friday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        friday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        saturday_working_hours_from?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        saturday_working_hours_to?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
        hide_from_storefront?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'key' | 'value'>
        >;
      }
    >;
  };
};

export type CustomerAddressesQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerAddressesQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Customer,
      'id' | 'email' | 'phone' | 'firstName' | 'lastName'
    > & {
      addresses: {
        nodes: Array<
          Pick<
            StorefrontAPI.MailingAddress,
            | 'id'
            | 'address1'
            | 'address2'
            | 'city'
            | 'country'
            | 'firstName'
            | 'lastName'
            | 'phone'
          >
        >;
      };
    }
  >;
};

export type MegaMenuCollectionsQueryVariables = StorefrontAPI.Exact<{
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type MegaMenuCollectionsQuery = {
  nodes: Array<
    StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
        products: {
          nodes: Array<
            Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
              featuredImage?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
            }
          >;
        };
      }
    >
  >;
};

export type FeaturedCollectionFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type FeaturedCollectionQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FeaturedCollectionQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      }
    >;
  };
};

export type RecommendedProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'title'
  | 'handle'
  | 'availableForSale'
  | 'productType'
  | 'isGiftCard'
  | 'tags'
> & {
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  is_limited_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  average_rating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  rating_count?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
};

export type RecommendedProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type RecommendedProductsQuery = {
  fallbackProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'title'
        | 'handle'
        | 'availableForSale'
        | 'productType'
        | 'isGiftCard'
        | 'tags'
      > & {
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        images: {
          nodes: Array<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        average_rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
  bestSellers?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  kunafa?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  sweets?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  arabic?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  cake?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  chocolateCake?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  cakes?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  chocolate?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  gifts?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
  gifting?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
          | 'tags'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          is_limited_time?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
};

export type NewArrivalProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'title'
  | 'handle'
  | 'availableForSale'
  | 'productType'
  | 'isGiftCard'
  | 'tags'
> & {
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  is_limited_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  average_rating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  rating_count?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
};

export type NewArrivalsProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type NewArrivalsProductsQuery = {
  taggedProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'title'
        | 'handle'
        | 'availableForSale'
        | 'productType'
        | 'isGiftCard'
        | 'tags'
      > & {
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        images: {
          nodes: Array<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        average_rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
  allProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'title'
        | 'handle'
        | 'availableForSale'
        | 'productType'
        | 'isGiftCard'
        | 'tags'
      > & {
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        images: {
          nodes: Array<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        average_rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
};

export type OccasionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type OccasionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
      }
    >;
  };
};

export type HomepageConfigQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HomepageConfigQuery = {
  heroSlides: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
            }>;
          }
        >;
      }
    >;
  };
  ramadanBanner: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
            }>;
          }
        >;
      }
    >;
  };
  offersSection: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  offerCards: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
            }>;
          }
        >;
      }
    >;
  };
};

export type CustomerAddressUpdateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  id: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: StorefrontAPI.Maybe<{
    customerAddress?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MailingAddress, 'id'>
    >;
    customerUserErrors: Array<Pick<StorefrontAPI.CustomerUserError, 'message'>>;
  }>;
};

export type CustomerAddressDeleteMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  id: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.CustomerAddressDeletePayload,
      'deletedCustomerAddressId'
    > & {
      customerUserErrors: Array<
        Pick<StorefrontAPI.CustomerUserError, 'message'>
      >;
    }
  >;
};

export type CustomerDefaultAddressUpdateMutationVariables =
  StorefrontAPI.Exact<{
    addressId: StorefrontAPI.Scalars['ID']['input'];
    customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  }>;

export type CustomerDefaultAddressUpdateMutation = {
  customerDefaultAddressUpdate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<{
      defaultAddress?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MailingAddress, 'id'>
      >;
    }>;
    customerUserErrors: Array<Pick<StorefrontAPI.CustomerUserError, 'message'>>;
  }>;
};

export type CustomerAddressCreateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: StorefrontAPI.Maybe<{
    customerAddress?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MailingAddress, 'id'>
    >;
    customerUserErrors: Array<Pick<StorefrontAPI.CustomerUserError, 'message'>>;
  }>;
};

export type GetDashboardCustomerIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetDashboardCustomerIdQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
};

export type GetLoyaltyCustomerQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetLoyaltyCustomerQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'id' | 'phone' | 'email'>
  >;
};

export type GetLoyaltyCustomerIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetLoyaltyCustomerIdQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
};

export type OrderItemFragment = Pick<
  StorefrontAPI.Order,
  | 'financialStatus'
  | 'fulfillmentStatus'
  | 'canceledAt'
  | 'id'
  | 'orderNumber'
  | 'customerUrl'
  | 'statusUrl'
  | 'processedAt'
> & {
  currentTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  customAttributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  lineItems: {
    nodes: Array<
      Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
        discountedTotalPrice: Pick<
          StorefrontAPI.MoneyV2,
          'amount' | 'currencyCode'
        >;
        customAttributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
        variant?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.ProductVariant, 'id'> & {
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url' | 'altText' | 'height' | 'width'>
            >;
            product: Pick<StorefrontAPI.Product, 'tags' | 'title'>;
          }
        >;
      }
    >;
  };
};

export type CustomerOrdersFragment = Pick<
  StorefrontAPI.Customer,
  'numberOfOrders'
> & {
  orders: {
    nodes: Array<
      Pick<
        StorefrontAPI.Order,
        | 'financialStatus'
        | 'fulfillmentStatus'
        | 'canceledAt'
        | 'id'
        | 'orderNumber'
        | 'customerUrl'
        | 'statusUrl'
        | 'processedAt'
      > & {
        currentTotalPrice: Pick<
          StorefrontAPI.MoneyV2,
          'amount' | 'currencyCode'
        >;
        customAttributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
        lineItems: {
          nodes: Array<
            Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
              discountedTotalPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              customAttributes: Array<
                Pick<StorefrontAPI.Attribute, 'key' | 'value'>
              >;
              variant?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'height' | 'width'
                    >
                  >;
                  product: Pick<StorefrontAPI.Product, 'tags' | 'title'>;
                }
              >;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type CustomerOrdersQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type CustomerOrdersQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'numberOfOrders'> & {
      orders: {
        nodes: Array<
          Pick<
            StorefrontAPI.Order,
            | 'financialStatus'
            | 'fulfillmentStatus'
            | 'canceledAt'
            | 'id'
            | 'orderNumber'
            | 'customerUrl'
            | 'statusUrl'
            | 'processedAt'
          > & {
            currentTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            customAttributes: Array<
              Pick<StorefrontAPI.Attribute, 'key' | 'value'>
            >;
            lineItems: {
              nodes: Array<
                Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
                  discountedTotalPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                  customAttributes: Array<
                    Pick<StorefrontAPI.Attribute, 'key' | 'value'>
                  >;
                  variant?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.ProductVariant, 'id'> & {
                      image?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'height' | 'width'
                        >
                      >;
                      product: Pick<StorefrontAPI.Product, 'tags' | 'title'>;
                    }
                  >;
                }
              >;
            };
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
        >;
      };
    }
  >;
};

export type GetDeleteProfileCustomerIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetDeleteProfileCustomerIdQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
};

export type GetProfileCustomerIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetProfileCustomerIdQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'id'> & {
      birthdate?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
    }
  >;
};

export type CustomerUpdateMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  customer: StorefrontAPI.CustomerUpdateInput;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'acceptsMarketing' | 'email' | 'firstName' | 'id' | 'lastName' | 'phone'
      >
    >;
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerFragment = Pick<
  StorefrontAPI.Customer,
  | 'id'
  | 'createdAt'
  | 'acceptsMarketing'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'numberOfOrders'
  | 'phone'
> & {
  addresses: {
    nodes: Array<
      Pick<
        StorefrontAPI.MailingAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'country'
        | 'province'
        | 'city'
        | 'zip'
        | 'phone'
      >
    >;
  };
  defaultAddress?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.MailingAddress,
      | 'id'
      | 'formatted'
      | 'firstName'
      | 'lastName'
      | 'company'
      | 'address1'
      | 'address2'
      | 'country'
      | 'province'
      | 'city'
      | 'zip'
      | 'phone'
    >
  >;
  birthdate?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  orders: {
    nodes: Array<
      Pick<
        StorefrontAPI.Order,
        | 'id'
        | 'orderNumber'
        | 'processedAt'
        | 'financialStatus'
        | 'fulfillmentStatus'
      > & {
        currentTotalPrice: Pick<
          StorefrontAPI.MoneyV2,
          'amount' | 'currencyCode'
        >;
        lineItems: {
          nodes: Array<
            Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
              customAttributes: Array<
                Pick<StorefrontAPI.Attribute, 'key' | 'value'>
              >;
              variant?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                }
              >;
            }
          >;
        };
      }
    >;
  };
};

export type AddressFragment = Pick<
  StorefrontAPI.MailingAddress,
  | 'id'
  | 'formatted'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'address1'
  | 'address2'
  | 'country'
  | 'province'
  | 'city'
  | 'zip'
  | 'phone'
>;

export type CustomerQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Customer,
      | 'id'
      | 'createdAt'
      | 'acceptsMarketing'
      | 'email'
      | 'firstName'
      | 'lastName'
      | 'numberOfOrders'
      | 'phone'
    > & {
      addresses: {
        nodes: Array<
          Pick<
            StorefrontAPI.MailingAddress,
            | 'id'
            | 'formatted'
            | 'firstName'
            | 'lastName'
            | 'company'
            | 'address1'
            | 'address2'
            | 'country'
            | 'province'
            | 'city'
            | 'zip'
            | 'phone'
          >
        >;
      };
      defaultAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'country'
          | 'province'
          | 'city'
          | 'zip'
          | 'phone'
        >
      >;
      birthdate?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      orders: {
        nodes: Array<
          Pick<
            StorefrontAPI.Order,
            | 'id'
            | 'orderNumber'
            | 'processedAt'
            | 'financialStatus'
            | 'fulfillmentStatus'
          > & {
            currentTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            lineItems: {
              nodes: Array<
                Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
                  customAttributes: Array<
                    Pick<StorefrontAPI.Attribute, 'key' | 'value'>
                  >;
                  variant?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.ProductVariant, 'id'> & {
                      image?: StorefrontAPI.Maybe<
                        Pick<StorefrontAPI.Image, 'url' | 'altText'>
                      >;
                    }
                  >;
                }
              >;
            };
          }
        >;
      };
    }
  >;
};

export type GetCustomerForVoucherQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerForVoucherQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id' | 'phone'>>;
};

export type CustomerActivateMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
  input: StorefrontAPI.CustomerActivateInput;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerActivateMutation = {
  customerActivate?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAccessTokenCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerAccessTokenCreateInput;
}>;

export type CustomerAccessTokenCreateMutation = {
  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
  }>;
};

export type CustomerRecoverMutationVariables = StorefrontAPI.Exact<{
  email: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerRecoverMutation = {
  customerRecover?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAccessTokenCreateRegisterMutationVariables =
  StorefrontAPI.Exact<{
    input: StorefrontAPI.CustomerAccessTokenCreateInput;
  }>;

export type CustomerAccessTokenCreateRegisterMutation = {
  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerResetMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
  input: StorefrontAPI.CustomerResetInput;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerResetMutation = {
  customerReset?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type GetCustomerPhoneVerifyPhoneQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerPhoneVerifyPhoneQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id' | 'phone'>>;
};

export type CustomerPhoneUpdateVerifyPhoneMutationVariables =
  StorefrontAPI.Exact<{
    customerAccessToken: StorefrontAPI.Scalars['String']['input'];
    customer: StorefrontAPI.CustomerUpdateInput;
  }>;

export type CustomerPhoneUpdateVerifyPhoneMutation = {
  customerUpdate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Customer, 'id' | 'phone'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type ArticleQueryVariables = StorefrontAPI.Exact<{
  articleHandle: StorefrontAPI.Scalars['String']['input'];
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ArticleQuery = {
  blog?: StorefrontAPI.Maybe<{
    articleByHandle?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Article, 'title' | 'contentHtml' | 'publishedAt'> & {
        author?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ArticleAuthor, 'name'>>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'description' | 'title'>
        >;
      }
    >;
  }>;
};

export type BlogQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'title'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'title' | 'description'>
      >;
      articles: {
        nodes: Array<
          Pick<
            StorefrontAPI.Article,
            | 'contentHtml'
            | 'excerpt'
            | 'handle'
            | 'id'
            | 'publishedAt'
            | 'title'
          > & {
            author?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ArticleAuthor, 'name'>
            >;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
            blog: Pick<StorefrontAPI.Blog, 'handle' | 'title'>;
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
        >;
      };
    }
  >;
};

export type ArticleItemFragment = Pick<
  StorefrontAPI.Article,
  'contentHtml' | 'excerpt' | 'handle' | 'id' | 'publishedAt' | 'title'
> & {
  author?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ArticleAuthor, 'name'>>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  blog: Pick<StorefrontAPI.Blog, 'handle' | 'title'>;
};

export type BlogsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogsQuery = {
  blogs: {
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
    nodes: Array<
      Pick<StorefrontAPI.Blog, 'title' | 'handle'> & {
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'title' | 'description'>
        >;
      }
    >;
  };
};

export type GetCustomerBasicQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerBasicQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'firstName' | 'lastName' | 'email'>
  >;
};

export type GetGiftCardProductQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetGiftCardProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      'id' | 'title' | 'handle' | 'availableForSale'
    > & {
      variants: {
        nodes: Array<
          Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'title' | 'availableForSale'
          > & {price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>}
        >;
      };
    }
  >;
};

export type GetLocationDiscountsForCartQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetLocationDiscountsForCartQuery = {
  shop: {
    locationDiscounts?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metafield, 'value'>
    >;
    locationDiscountsAlt?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metafield, 'value'>
    >;
  };
};

export type GetCartCustomerDetailsQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCartCustomerDetailsQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'id' | 'email' | 'tags'>
  >;
};

export type CheckoutCartQueryVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
}>;

export type CheckoutCartQuery = {
  cart?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Cart, 'id' | 'checkoutUrl' | 'note'> & {
      cost: {
        subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      };
      lines: {
        nodes: Array<
          | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
              merchandise: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'sku'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount'>;
                product: Pick<StorefrontAPI.Product, 'title' | 'id'>;
              };
            })
          | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
              merchandise: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'sku'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount'>;
                product: Pick<StorefrontAPI.Product, 'title' | 'id'>;
              };
            })
        >;
      };
      attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
    }
  >;
};

export type MoneyProductItemFragment = Pick<
  StorefrontAPI.MoneyV2,
  'amount' | 'currencyCode'
>;

export type HandleProductItemFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'handle'
  | 'title'
  | 'productType'
  | 'availableForSale'
  | 'isGiftCard'
  | 'tags'
> & {
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  is_limited_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
};

export type CollectionQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type CollectionQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'description'
    > & {
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
      >;
      products: {
        nodes: Array<
          Pick<
            StorefrontAPI.Product,
            | 'id'
            | 'handle'
            | 'title'
            | 'productType'
            | 'availableForSale'
            | 'isGiftCard'
            | 'tags'
          > & {
            variants: {
              nodes: Array<
                Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                  storeAvailability: {
                    nodes: Array<
                      Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                        location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                      }
                    >;
                  };
                }
              >;
            };
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              maxVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            compareAtPriceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            visibility_start?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            visibility_end?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            is_limited_time?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            bogo_free_item?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'> & {
                reference?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.ProductVariant, 'id'>
                >;
              }
            >;
          }
        >;
        edges: Array<
          Pick<StorefrontAPI.ProductEdge, 'cursor'> & {
            node: Pick<StorefrontAPI.Product, 'id'>;
          }
        >;
        filters: Array<
          Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
            values: Array<
              Pick<
                StorefrontAPI.FilterValue,
                'id' | 'label' | 'count' | 'input'
              >
            >;
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
        >;
      };
    }
  >;
};

export type FeaturedProductsFallbackQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FeaturedProductsFallbackQuery = {
  taggedProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'productType'
        | 'availableForSale'
        | 'isGiftCard'
        | 'tags'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
      }
    >;
  };
  allProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'productType'
        | 'availableForSale'
        | 'isGiftCard'
        | 'tags'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
      }
    >;
  };
};

export type CorporateProductsFallbackQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CorporateProductsFallbackQuery = {
  allProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'productType'
        | 'availableForSale'
        | 'isGiftCard'
        | 'tags'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
      }
    >;
  };
};

export type FilterProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'title' | 'availableForSale' | 'quantityAvailable'
      > & {
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
};

export type CollectionFilterQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CollectionFilterQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
        > & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'altText' | 'url' | 'width' | 'height'
            >
          >;
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            maxVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          variants: {
            nodes: Array<
              Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'availableForSale' | 'quantityAvailable'
              > & {
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                    }
                  >;
                };
              }
            >;
          };
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
        }
      >;
    };
  }>;
};

export type AllProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'productType' | 'availableForSale' | 'tags'
> & {
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  is_limited_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
};

export type CatalogSearchQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  query: StorefrontAPI.Scalars['String']['input'];
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.SearchSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type CatalogSearchQuery = {
  search: {
    productFilters: Array<
      Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
        values: Array<
          Pick<StorefrontAPI.FilterValue, 'id' | 'label' | 'count' | 'input'>
        >;
      }
    >;
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'handle' | 'title' | 'productType' | 'availableForSale' | 'tags'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        is_limited_time?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'> & {
        products: {nodes: Array<Pick<StorefrontAPI.Product, 'id'>>};
      }
    >;
  };
};

export type CorporateProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'description' | 'availableForSale' | 'tags'
> & {
  summary?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  subtitle?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  b2bTiers?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'title' | 'availableForSale'
      > & {
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      }
    >;
  };
};

export type CorporateProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CorporateProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'handle' | 'title' | 'description' | 'availableForSale' | 'tags'
      > & {
        summary?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        subtitle?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        b2bTiers?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            }
          >;
        };
      }
    >;
  };
  collections: {
    nodes: Array<
      Pick<
        StorefrontAPI.Collection,
        'id' | 'handle' | 'title' | 'description'
      > & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText'>
        >;
      }
    >;
  };
};

export type CakeAttributesQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CakeAttributesQuery = {
  cakeAttributes: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        attributeType?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        nameEn?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        nameAr?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        priceDelta?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        thumbnailUrl?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
        imageFront?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
        imageTop?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
        imageSliced?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
      }
    >;
  };
  toppingDesigns: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        topping?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metaobject, 'id'>
            >;
          }
        >;
        shape?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metaobject, 'id'>
            >;
          }
        >;
        imageFront?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
        imageTop?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
        imageSliced?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
          }>;
        }>;
      }
    >;
  };
  cakeSettings: {
    nodes: Array<{
      preparationHours?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
    }>;
  };
};

export type GetShippingCustomerQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetShippingCustomerQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Customer,
      'firstName' | 'lastName' | 'email' | 'phone'
    > & {
      defaultAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'address1'
          | 'address2'
          | 'city'
          | 'country'
          | 'zip'
          | 'phone'
          | 'firstName'
          | 'lastName'
        >
      >;
    }
  >;
};

export type ExportCatalogSearchQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  query: StorefrontAPI.Scalars['String']['input'];
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.SearchSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type ExportCatalogSearchQuery = {
  exportCollection?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Collection, 'id' | 'title'> & {
      products: {
        filters: Array<
          Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
            values: Array<
              Pick<
                StorefrontAPI.FilterValue,
                'id' | 'label' | 'count' | 'input'
              >
            >;
          }
        >;
        nodes: Array<
          Pick<
            StorefrontAPI.Product,
            'id' | 'title' | 'handle' | 'availableForSale'
          > & {
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            variants: {
              nodes: Array<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'id' | 'availableForSale'
                > & {
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                }
              >;
            };
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
        >;
      };
    }
  >;
  search: {
    productFilters: Array<
      Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
        values: Array<
          Pick<StorefrontAPI.FilterValue, 'id' | 'label' | 'count' | 'input'>
        >;
      }
    >;
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'handle' | 'availableForSale'
      > & {
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'> & {
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
  collections: {
    nodes: Array<Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'>>;
  };
};

export type ExportCollectionFilterQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ExportCollectionFilterQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          featuredImage?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'> & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
              }
            >;
          };
        }
      >;
    };
  }>;
};

export type CheckOrderReviewsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type CheckOrderReviewsQuery = {
  orderReviews: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  storefrontReviews: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
};

export type GetFeedbackLocationsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetFeedbackLocationsQuery = {
  locations: {
    nodes: Array<
      Pick<StorefrontAPI.Location, 'id' | 'name'> & {
        name_in_arabic?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
      }
    >;
  };
};

export type GiftingProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'title' | 'availableForSale' | 'quantityAvailable'
      > & {
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      }
    >;
  };
};

export type GiftingProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type GiftingProductsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
      }
    >;
  };
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale' | 'quantityAvailable'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            }
          >;
        };
      }
    >;
  };
};

export type OccasionsProductItemFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'title' | 'availableForSale' | 'quantityAvailable'
      > & {
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
};

export type OccasionsProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type OccasionsProductsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
      }
    >;
  };
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'handle' | 'title' | 'availableForSale' | 'tags'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale' | 'quantityAvailable'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
};

export type HandlePageQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type HandlePageQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'id' | 'handle' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type TermsPageQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type TermsPageQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'id' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type PolicyFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'body' | 'handle' | 'id' | 'title' | 'url'
>;

export type PolicyQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  privacyPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  refundPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  shippingPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  termsOfService: StorefrontAPI.Scalars['Boolean']['input'];
}>;

export type PolicyQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
  };
};

export type PolicyItemFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'id' | 'title' | 'handle'
>;

export type PoliciesQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type PoliciesQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    subscriptionPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicyWithDefault, 'id' | 'title' | 'handle'>
    >;
  };
};

export type PredictiveSearchQueryVariables = StorefrontAPI.Exact<{
  query: StorefrontAPI.Scalars['String']['input'];
  limit?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type PredictiveSearchQuery = {
  predictiveSearch?: StorefrontAPI.Maybe<{
    queries: Array<
      Pick<StorefrontAPI.SearchQuerySuggestion, 'text' | 'styledText'>
    >;
    products: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'handle' | 'isGiftCard' | 'productType'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            }
          >;
        };
      }
    >;
    collections: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
      }
    >;
  }>;
};

export type ProductHandleQueryVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductHandleQuery = {
  product?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Product, 'handle'>>;
};

export type GetProductReviewsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetProductReviewsQuery = {
  metaobjects: {
    nodes: Array<{
      fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
    }>;
  };
};

export type CustomerPurchasesQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerPurchasesQuery = {
  customer?: StorefrontAPI.Maybe<{
    orders: {
      nodes: Array<{
        lineItems: {
          nodes: Array<{
            variant?: StorefrontAPI.Maybe<{
              product: Pick<StorefrontAPI.Product, 'id'>;
            }>;
          }>;
        };
      }>;
    };
  }>;
};

export type ProductVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontAPI.Maybe<
    {__typename: 'Image'} & Pick<
      StorefrontAPI.Image,
      'id' | 'url' | 'altText' | 'width' | 'height'
    >
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  components: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
        productVariant: Pick<
          StorefrontAPI.ProductVariant,
          'id' | 'title' | 'sku'
        > & {
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText'>
          >;
          product: Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
            featuredImage?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url' | 'altText'>
            >;
          };
        };
      }
    >;
  };
  storeAvailability: {
    nodes: Array<
      Pick<StorefrontAPI.StoreAvailability, 'available'> & {
        location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
      }
    >;
  };
};

export type ProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'title'
  | 'vendor'
  | 'handle'
  | 'descriptionHtml'
  | 'description'
  | 'productType'
  | 'isGiftCard'
  | 'tags'
> & {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        title_in_arabic?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        title_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        name_in_arabic?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        name_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        leadTime?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      }
    >;
  };
  name_in_arabic?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  title_in_arabic?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  arabic_name?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  arabic_title?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  name_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  title_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bundle_components?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText'>
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'sku'> & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              }
            >;
          };
        }
      >;
    }>;
  }>;
  options: Array<
    Pick<StorefrontAPI.ProductOption, 'name'> & {
      optionValues: Array<Pick<StorefrontAPI.ProductOptionValue, 'name'>>;
    }
  >;
  addons?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          'id' | 'title' | 'handle' | 'availableForSale'
        > & {
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'sku'> & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
              }
            >;
          };
        }
      >;
    }>;
  }>;
  upsell_products?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          'id' | 'title' | 'handle' | 'availableForSale'
        > & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          variants: {
            nodes: Array<
              Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'sku' | 'availableForSale'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
              }
            >;
          };
        }
      >;
    }>;
  }>;
  product_upsells?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          'id' | 'title' | 'handle' | 'availableForSale'
        > & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          variants: {
            nodes: Array<
              Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'sku' | 'availableForSale'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
              }
            >;
          };
        }
      >;
    }>;
  }>;
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  next_season_date?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  seasonal_message?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  nutrition?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  allergens?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  calories?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  prep_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  servings?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  estimated_delivery?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  delivery_override?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  average_rating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  rating_count?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
  vegan?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  lactose_free?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  gluten_free?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  restock_date?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  expected_restock_date?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  related_products?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<
        | (Pick<
            StorefrontAPI.Product,
            | 'id'
            | 'title'
            | 'handle'
            | 'availableForSale'
            | 'productType'
            | 'isGiftCard'
          > & {
            compareAtPriceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            images: {
              nodes: Array<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
            };
            visibility_start?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            visibility_end?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            average_rating?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            rating_count?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            bogo_free_item?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'> & {
                reference?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.ProductVariant, 'id'>
                >;
              }
            >;
            variants: {
              nodes: Array<
                Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                  storeAvailability: {
                    nodes: Array<
                      Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                        location: Pick<StorefrontAPI.Location, 'id'>;
                      }
                    >;
                  };
                }
              >;
            };
          })
        | (Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            product: Pick<
              StorefrontAPI.Product,
              | 'id'
              | 'title'
              | 'handle'
              | 'availableForSale'
              | 'productType'
              | 'isGiftCard'
            > & {
              compareAtPriceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              priceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              featuredImage?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              images: {
                nodes: Array<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
              };
              visibility_start?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              visibility_end?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              average_rating?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              rating_count?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              bogo_free_item?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'> & {
                  reference?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.ProductVariant, 'id'>
                  >;
                }
              >;
              variants: {
                nodes: Array<
                  Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'width' | 'height'
                      >
                    >;
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                    compareAtPrice?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                    >;
                    selectedOptions: Array<
                      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                    >;
                    product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                    storeAvailability: {
                      nodes: Array<
                        Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                          location: Pick<StorefrontAPI.Location, 'id'>;
                        }
                      >;
                    };
                  }
                >;
              };
            };
          })
      >;
    }>;
  }>;
  selectedVariant?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontAPI.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      components: {
        nodes: Array<
          Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
            productVariant: Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'sku'
            > & {
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
              product: Pick<
                StorefrontAPI.Product,
                'id' | 'title' | 'handle'
              > & {
                featuredImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
              };
            };
          }
        >;
      };
      storeAvailability: {
        nodes: Array<
          Pick<StorefrontAPI.StoreAvailability, 'available'> & {
            location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
          }
        >;
      };
    }
  >;
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'availableForSale' | 'id' | 'sku' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        image?: StorefrontAPI.Maybe<
          {__typename: 'Image'} & Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        unitPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        components: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
              productVariant: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'sku'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  'id' | 'title' | 'handle'
                > & {
                  featuredImage?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                };
              };
            }
          >;
        };
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
  seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
};

export type ProductDetailRecommendedProductFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'title' | 'handle' | 'availableForSale' | 'productType' | 'isGiftCard'
> & {
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
  visibility_start?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'>
  >;
  visibility_end?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  average_rating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  rating_count?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  bogo_free_item?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metafield, 'value'> & {
      reference?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ProductVariant, 'id'>>;
    }
  >;
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id'>;
            }
          >;
        };
      }
    >;
  };
};

export type ProductQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      | 'id'
      | 'title'
      | 'vendor'
      | 'handle'
      | 'descriptionHtml'
      | 'description'
      | 'productType'
      | 'isGiftCard'
      | 'tags'
    > & {
      collections: {
        nodes: Array<
          Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
            title_in_arabic?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            title_ar?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            name_in_arabic?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            name_ar?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            leadTime?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
          }
        >;
      };
      name_in_arabic?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      title_in_arabic?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      arabic_name?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      arabic_title?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      name_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      title_ar?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      bundle_components?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
              featuredImage?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
              variants: {
                nodes: Array<
                  Pick<StorefrontAPI.ProductVariant, 'sku'> & {
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  }
                >;
              };
            }
          >;
        }>;
      }>;
      options: Array<
        Pick<StorefrontAPI.ProductOption, 'name'> & {
          optionValues: Array<Pick<StorefrontAPI.ProductOptionValue, 'name'>>;
        }
      >;
      addons?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<
              StorefrontAPI.Product,
              'id' | 'title' | 'handle' | 'availableForSale'
            > & {
              variants: {
                nodes: Array<
                  Pick<StorefrontAPI.ProductVariant, 'id' | 'sku'> & {
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'width' | 'height'
                      >
                    >;
                  }
                >;
              };
            }
          >;
        }>;
      }>;
      upsell_products?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<
              StorefrontAPI.Product,
              'id' | 'title' | 'handle' | 'availableForSale'
            > & {
              featuredImage?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              priceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              variants: {
                nodes: Array<
                  Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'sku' | 'availableForSale'
                  > & {
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                    image?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url' | 'altText'>
                    >;
                  }
                >;
              };
            }
          >;
        }>;
      }>;
      product_upsells?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<
              StorefrontAPI.Product,
              'id' | 'title' | 'handle' | 'availableForSale'
            > & {
              featuredImage?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              priceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              variants: {
                nodes: Array<
                  Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'sku' | 'availableForSale'
                  > & {
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                    image?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url' | 'altText'>
                    >;
                  }
                >;
              };
            }
          >;
        }>;
      }>;
      visibility_start?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      visibility_end?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      next_season_date?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      seasonal_message?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      nutrition?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      allergens?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      calories?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      prep_time?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      servings?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      estimated_delivery?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      delivery_override?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      average_rating?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      rating_count?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      bogo_free_item?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'> & {
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ProductVariant, 'id'>
          >;
        }
      >;
      vegan?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      lactose_free?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      gluten_free?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      restock_date?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      expected_restock_date?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      related_products?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            | (Pick<
                StorefrontAPI.Product,
                | 'id'
                | 'title'
                | 'handle'
                | 'availableForSale'
                | 'productType'
                | 'isGiftCard'
              > & {
                compareAtPriceRange: {
                  minVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                priceRange: {
                  minVariantPrice: Pick<
                    StorefrontAPI.MoneyV2,
                    'amount' | 'currencyCode'
                  >;
                };
                featuredImage?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
                images: {
                  nodes: Array<
                    Pick<
                      StorefrontAPI.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                };
                visibility_start?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metafield, 'value'>
                >;
                visibility_end?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metafield, 'value'>
                >;
                average_rating?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metafield, 'value'>
                >;
                rating_count?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metafield, 'value'>
                >;
                bogo_free_item?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Metafield, 'value'> & {
                    reference?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.ProductVariant, 'id'>
                    >;
                  }
                >;
                variants: {
                  nodes: Array<
                    Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                      image?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                      price: Pick<
                        StorefrontAPI.MoneyV2,
                        'amount' | 'currencyCode'
                      >;
                      compareAtPrice?: StorefrontAPI.Maybe<
                        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                      >;
                      selectedOptions: Array<
                        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                      >;
                      product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                      storeAvailability: {
                        nodes: Array<
                          Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                            location: Pick<StorefrontAPI.Location, 'id'>;
                          }
                        >;
                      };
                    }
                  >;
                };
              })
            | (Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  | 'id'
                  | 'title'
                  | 'handle'
                  | 'availableForSale'
                  | 'productType'
                  | 'isGiftCard'
                > & {
                  compareAtPriceRange: {
                    minVariantPrice: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  priceRange: {
                    minVariantPrice: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                  };
                  featuredImage?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  images: {
                    nodes: Array<
                      Pick<
                        StorefrontAPI.Image,
                        'id' | 'url' | 'altText' | 'width' | 'height'
                      >
                    >;
                  };
                  visibility_start?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'>
                  >;
                  visibility_end?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'>
                  >;
                  average_rating?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'>
                  >;
                  rating_count?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'>
                  >;
                  bogo_free_item?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Metafield, 'value'> & {
                      reference?: StorefrontAPI.Maybe<
                        Pick<StorefrontAPI.ProductVariant, 'id'>
                      >;
                    }
                  >;
                  variants: {
                    nodes: Array<
                      Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                        image?: StorefrontAPI.Maybe<
                          Pick<
                            StorefrontAPI.Image,
                            'url' | 'altText' | 'width' | 'height'
                          >
                        >;
                        price: Pick<
                          StorefrontAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >;
                        compareAtPrice?: StorefrontAPI.Maybe<
                          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                        >;
                        selectedOptions: Array<
                          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                        >;
                        product: Pick<
                          StorefrontAPI.Product,
                          'handle' | 'title'
                        >;
                        storeAvailability: {
                          nodes: Array<
                            Pick<
                              StorefrontAPI.StoreAvailability,
                              'available'
                            > & {location: Pick<StorefrontAPI.Location, 'id'>}
                          >;
                        };
                      }
                    >;
                  };
                };
              })
          >;
        }>;
      }>;
      selectedVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          components: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
                productVariant: Pick<
                  StorefrontAPI.ProductVariant,
                  'id' | 'title' | 'sku'
                > & {
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  image?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                  product: Pick<
                    StorefrontAPI.Product,
                    'id' | 'title' | 'handle'
                  > & {
                    featuredImage?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url' | 'altText'>
                    >;
                  };
                };
              }
            >;
          };
          storeAvailability: {
            nodes: Array<
              Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
              }
            >;
          };
        }
      >;
      variants: {
        nodes: Array<
          Pick<
            StorefrontAPI.ProductVariant,
            'availableForSale' | 'id' | 'sku' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            image?: StorefrontAPI.Maybe<
              {__typename: 'Image'} & Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            unitPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            components: {
              nodes: Array<
                Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
                  productVariant: Pick<
                    StorefrontAPI.ProductVariant,
                    'id' | 'title' | 'sku'
                  > & {
                    price: Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >;
                    image?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url' | 'altText'>
                    >;
                    product: Pick<
                      StorefrontAPI.Product,
                      'id' | 'title' | 'handle'
                    > & {
                      featuredImage?: StorefrontAPI.Maybe<
                        Pick<StorefrontAPI.Image, 'url' | 'altText'>
                      >;
                    };
                  };
                }
              >;
            };
            storeAvailability: {
              nodes: Array<
                Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                  location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                }
              >;
            };
          }
        >;
      };
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      images: {
        nodes: Array<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      };
    }
  >;
};

export type ProductVariantsFragment = {
  variants: {
    nodes: Array<
      Pick<
        StorefrontAPI.ProductVariant,
        'availableForSale' | 'id' | 'sku' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        image?: StorefrontAPI.Maybe<
          {__typename: 'Image'} & Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        unitPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        components: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
              productVariant: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'sku'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  'id' | 'title' | 'handle'
                > & {
                  featuredImage?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                };
              };
            }
          >;
        };
        storeAvailability: {
          nodes: Array<
            Pick<StorefrontAPI.StoreAvailability, 'available'> & {
              location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
            }
          >;
        };
      }
    >;
  };
};

export type ProductReviewsQueryVariables = StorefrontAPI.Exact<{
  type: StorefrontAPI.Scalars['String']['input'];
}>;

export type ProductReviewsQuery = {
  metaobjects: {
    nodes: Array<{
      fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
    }>;
  };
};

export type ProductVariantsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type ProductVariantsQuery = {
  product?: StorefrontAPI.Maybe<{
    variants: {
      nodes: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          components: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariantComponent, 'quantity'> & {
                productVariant: Pick<
                  StorefrontAPI.ProductVariant,
                  'id' | 'title' | 'sku'
                > & {
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  image?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                  product: Pick<
                    StorefrontAPI.Product,
                    'id' | 'title' | 'handle'
                  > & {
                    featuredImage?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url' | 'altText'>
                    >;
                  };
                };
              }
            >;
          };
          storeAvailability: {
            nodes: Array<
              Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
              }
            >;
          };
        }
      >;
    };
  }>;
};

export type ProductRecommendationsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  productId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductRecommendationsQuery = {
  productRecommendations?: StorefrontAPI.Maybe<
    Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'title'
        | 'handle'
        | 'availableForSale'
        | 'productType'
        | 'isGiftCard'
      > & {
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        images: {
          nodes: Array<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        average_rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >
  >;
};

export type CollectionProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  collectionId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CollectionProductsQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<
          StorefrontAPI.Product,
          | 'id'
          | 'title'
          | 'handle'
          | 'availableForSale'
          | 'productType'
          | 'isGiftCard'
        > & {
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          featuredImage?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          images: {
            nodes: Array<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
          };
          visibility_start?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          visibility_end?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          average_rating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          rating_count?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          bogo_free_item?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'> & {
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id'>
              >;
            }
          >;
          variants: {
            nodes: Array<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                storeAvailability: {
                  nodes: Array<
                    Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                      location: Pick<StorefrontAPI.Location, 'id'>;
                    }
                  >;
                };
              }
            >;
          };
        }
      >;
    };
  }>;
};

export type NewestProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type NewestProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'title'
        | 'handle'
        | 'availableForSale'
        | 'productType'
        | 'isGiftCard'
      > & {
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        images: {
          nodes: Array<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        average_rating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        rating_count?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        bogo_free_item?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'> & {
            reference?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id'>
            >;
          }
        >;
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
};

export type GetPromotionalProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type GetPromotionalProductsQuery = {
  heroMeta: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
            }>;
          }
        >;
      }
    >;
  };
  bogoMeta: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  gridMeta: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  bannerMeta: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'handle' | 'title' | 'tags' | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale'
            > & {
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >;
  };
};

export type QualityPolicyPageQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type QualityPolicyPageQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'id' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type CollectionIdsQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CollectionIdsQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {nodes: Array<Pick<StorefrontAPI.Product, 'id'>>};
  }>;
};

export type SearchProductFragment = {__typename: 'Product'} & Pick<
  StorefrontAPI.Product,
  | 'handle'
  | 'id'
  | 'publishedAt'
  | 'title'
  | 'availableForSale'
  | 'trackingParameters'
  | 'vendor'
  | 'tags'
  | 'productType'
  | 'isGiftCard'
> & {
    featuredImage?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
    >;
    priceRange: {
      minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      maxVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    };
    compareAtPriceRange: {
      minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    };
    variants: {
      nodes: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'id' | 'title' | 'availableForSale'
        > & {
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
        }
      >;
    };
  };

export type SearchQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  query: StorefrontAPI.Scalars['String']['input'];
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  productFilters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.SearchSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type SearchQuery = {
  products: {
    nodes: Array<
      {__typename: 'Product'} & Pick<
        StorefrontAPI.Product,
        | 'handle'
        | 'id'
        | 'publishedAt'
        | 'title'
        | 'availableForSale'
        | 'trackingParameters'
        | 'vendor'
        | 'tags'
        | 'productType'
        | 'isGiftCard'
      > & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'altText' | 'url' | 'width' | 'height'
            >
          >;
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            maxVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          variants: {
            nodes: Array<
              Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'title' | 'availableForSale'
              > & {
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
              }
            >;
          };
        }
    >;
    productFilters: Array<
      Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
        values: Array<
          Pick<StorefrontAPI.FilterValue, 'id' | 'label' | 'count' | 'input'>
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
  };
  collections: {
    nodes: Array<Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'>>;
  };
};

export type GetVouchersCustomerQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetVouchersCustomerQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Customer, 'id' | 'phone' | 'email'>
  >;
};

export type CustomerAccessTokenCreateSocialMutationVariables =
  StorefrontAPI.Exact<{
    input: StorefrontAPI.CustomerAccessTokenCreateInput;
  }>;

export type CustomerAccessTokenCreateSocialMutation = {
  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type GetCustomerIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerIdQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id' | 'email'>>;
};

export type CustomerAddressesForLocationIdQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerAddressesForLocationIdQuery = {
  customer?: StorefrontAPI.Maybe<{
    addresses: {
      nodes: Array<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'id'
          | 'firstName'
          | 'lastName'
          | 'address1'
          | 'address2'
          | 'city'
          | 'country'
          | 'phone'
        >
      >;
    };
  }>;
};

export type GetCustomerEnrollmentQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerEnrollmentQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'createdAt'>>;
};

export type GetProductsForWishlistQueryVariables = StorefrontAPI.Exact<{
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type GetProductsForWishlistQuery = {
  nodes: Array<
    StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'handle' | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          maxVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        visibility_start?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        visibility_end?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'title' | 'availableForSale' | 'quantityAvailable'
            > & {
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              storeAvailability: {
                nodes: Array<
                  Pick<StorefrontAPI.StoreAvailability, 'available'> & {
                    location: Pick<StorefrontAPI.Location, 'id' | 'name'>;
                  }
                >;
              };
            }
          >;
        };
      }
    >
  >;
};

export type GetCustomerEnrollmentDateQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type GetCustomerEnrollmentDateQuery = {
  customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'createdAt'>>;
};

interface GeneratedQueryTypes {
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  query Footer(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: FooterQuery;
    variables: FooterQueryVariables;
  };
  '#graphql\n          query getCustomerGid($customerAccessToken: String!) {\n            customer(customerAccessToken: $customerAccessToken) { id }\n          }\n          ': {
    return: GetCustomerGidQuery;
    variables: GetCustomerGidQueryVariables;
  };
  '#graphql\n      query GetReviews {\n        sfReviews: metaobjects(type: "storefront_review", first: 250) {\n          nodes {\n            id\n            fields { key value }\n          }\n        }\n        ordReviews: metaobjects(type: "order_review", first: 250) {\n          nodes {\n            id\n            fields { key value }\n          }\n        }\n      }\n    ': {
    return: GetReviewsQuery;
    variables: GetReviewsQueryVariables;
  };
  '#graphql\n      query GetShopLocationDiscounts {\n        shop {\n          locationDiscounts: metafield(namespace: "custom", key: "location_discounts") { value }\n          locationDiscountsAlt: metafield(namespace: "location", key: "discounts") { value }\n        }\n      }\n    ': {
    return: GetShopLocationDiscountsQuery;
    variables: GetShopLocationDiscountsQueryVariables;
  };
  '#graphql\n  query Locations {\n    locations(first: 250) {\n      nodes {\n        id\n        name\n        address {\n          address1\n          address2\n          city\n          country\n          latitude\n          longitude\n          phone\n        }\n        city: metafield(namespace: "custom", key: "city") {\n          key\n          value\n        }\n        delivery_fee: metafield(namespace: "custom", key: "delivery_fee") {\n          key\n          value\n        }\n        free_delivery_threshold: metafield(namespace: "custom", key: "free_delivery_threshold") {\n          key\n          value\n        }\n        promo_free_delivery_from: metafield(namespace: "custom", key: "promo_free_delivery_from") {\n          key\n          value\n        }\n        promo_free_delivery_to: metafield(namespace: "custom", key: "promo_free_delivery_to") {\n          key\n          value\n        }\n        delivery_hours_from: metafield(namespace: "custom", key: "delivery_hours_from") {\n          key\n          value\n        }\n        delivery_hours_to: metafield(namespace: "custom", key: "delivery_hours_to") {\n          key\n          value\n        }\n        delivery_hours_from_shift2: metafield(namespace: "custom", key: "delivery_hours_from_shift2") {\n          key\n          value\n        }\n        delivery_hours_to_shift2: metafield(namespace: "custom", key: "delivery_hours_to_shift2") {\n          key\n          value\n        }\n        working_hours_from: metafield(namespace: "custom", key: "working_hours_from") {\n          key\n          value\n        }\n        working_hours_to: metafield(namespace: "custom", key: "working_hours_to") {\n          key\n          value\n        }\n        working_hours_from_shift2: metafield(namespace: "custom", key: "working_hours_from_shift2") {\n          key\n          value\n        }\n        working_hours_to_shift2: metafield(namespace: "custom", key: "working_hours_to_shift2") {\n          key\n          value\n        }\n        sunday_working_hours_from: metafield(namespace: "custom", key: "sunday_working_hours_from") {\n          key\n          value\n        }\n        sunday_working_hours_to: metafield(namespace: "custom", key: "sunday_working_hours_to") {\n          key\n          value\n        }\n        monday_working_hours_from: metafield(namespace: "custom", key: "monday_working_hours_from") {\n          key\n          value\n        }\n        monday_working_hours_to: metafield(namespace: "custom", key: "monday_working_hours_to") {\n          key\n          value\n        }\n        tuesday_working_hours_from: metafield(namespace: "custom", key: "tuesday_working_hours_from") {\n          key\n          value\n        }\n        tuesday_working_hours_to: metafield(namespace: "custom", key: "tuesday_working_hours_to") {\n          key\n          value\n        }\n        wednesday_working_hours_from: metafield(namespace: "custom", key: "wednesday_working_hours_from") {\n          key\n          value\n        }\n        wednesday_working_hours_to: metafield(namespace: "custom", key: "wednesday_working_hours_to") {\n          key\n          value\n        }\n        thursday_working_hours_from: metafield(namespace: "custom", key: "thursday_working_hours_from") {\n          key\n          value\n        }\n        thursday_working_hours_to: metafield(namespace: "custom", key: "thursday_working_hours_to") {\n          key\n          value\n        }\n        friday_working_hours_from: metafield(namespace: "custom", key: "friday_working_hours_from") {\n          key\n          value\n        }\n        friday_working_hours_to: metafield(namespace: "custom", key: "friday_working_hours_to") {\n          key\n          value\n        }\n        saturday_working_hours_from: metafield(namespace: "custom", key: "saturday_working_hours_from") {\n          key\n          value\n        }\n        saturday_working_hours_to: metafield(namespace: "custom", key: "saturday_working_hours_to") {\n          key\n          value\n        }\n        rating: metafield(namespace: "custom", key: "rating") {\n          key\n          value\n        }\n        rating_count: metafield(namespace: "custom", key: "rating_count") {\n          key\n          value\n        }\n        hide_from_storefront: metafield(namespace: "custom", key: "hide_from_storefront") {\n          key\n          value\n        }\n      }\n    }\n  }\n': {
    return: LocationsQuery;
    variables: LocationsQueryVariables;
  };
  '#graphql\n  query CustomerAddresses($customerAccessToken: String!) {\n    customer(customerAccessToken: $customerAccessToken) {\n      id\n      email\n      phone\n      firstName\n      lastName\n      addresses(first: 20) {\n        nodes {\n          id\n          address1\n          address2\n          city\n          country\n          firstName\n          lastName\n          phone\n        }\n      }\n    }\n  }\n': {
    return: CustomerAddressesQuery;
    variables: CustomerAddressesQueryVariables;
  };
  '#graphql\n  query MegaMenuCollections($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    nodes(ids: $ids) {\n      ... on Collection {\n        id\n        title\n        handle\n        image {\n          url\n          altText\n        }\n        products(first: 6) {\n          nodes {\n            id\n            title\n            handle\n            featuredImage {\n              url\n              altText\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: MegaMenuCollectionsQuery;
    variables: MegaMenuCollectionsQueryVariables;
  };
  '#graphql\n  fragment FeaturedCollection on Collection {\n    id\n    title\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    handle\n  }\n  query FeaturedCollection($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...FeaturedCollection\n      }\n    }\n  }\n': {
    return: FeaturedCollectionQuery;
    variables: FeaturedCollectionQueryVariables;
  };
  '#graphql\n  fragment RecommendedProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    tags\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    is_limited_time: metafield(namespace: "custom", key: "is_limited_time") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    \n    fallbackProducts: products(first: 30, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...RecommendedProduct\n      }\n    }\n\n    bestSellers: collection(handle: "best-sellers") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    kunafa: collection(handle: "kunafa") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    sweets: collection(handle: "sweets") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    arabic: collection(handle: "arabic") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    cake: collection(handle: "cake") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    chocolateCake: collection(handle: "chocolate-cake") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    cakes: collection(handle: "cakes") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    chocolate: collection(handle: "chocolate") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    gifts: collection(handle: "gifts") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n\n    gifting: collection(handle: "gifting") {\n      products(first: 20) {\n        nodes {\n          ...RecommendedProduct\n        }\n      }\n    }\n  }\n': {
    return: RecommendedProductsQuery;
    variables: RecommendedProductsQueryVariables;
  };
  '#graphql\n  fragment NewArrivalProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    tags\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    is_limited_time: metafield(namespace: "custom", key: "is_limited_time") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n  query NewArrivalsProducts ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    taggedProducts: products(first: 10, sortKey: CREATED_AT, reverse: true, query: "tag:special OR tag:special-collection OR tag:special_collection OR tag:featured OR tag:\'special collection\'") {\n      nodes {\n        ...NewArrivalProduct\n      }\n    }\n    allProducts: products(first: 10, sortKey: CREATED_AT, reverse: true) {\n      nodes {\n        ...NewArrivalProduct\n      }\n    }\n  }\n': {
    return: NewArrivalsProductsQuery;
    variables: NewArrivalsProductsQueryVariables;
  };
  '#graphql\n  query Occasions($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    collections(first: 100) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          url\n          altText\n          width\n          height\n        }\n      }\n    }\n  }\n': {
    return: OccasionsQuery;
    variables: OccasionsQueryVariables;
  };
  '#graphql\n  query HomepageConfig($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    heroSlides: metaobjects(type: "hero_slide", first: 20) {\n      nodes {\n        id\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image { url }\n            }\n          }\n        }\n      }\n    }\n    ramadanBanner: metaobjects(type: "ramadan_banner", first: 1) {\n      nodes {\n        id\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image { url }\n            }\n          }\n        }\n      }\n    }\n    offersSection: metaobjects(type: "offers_section", first: 1) {\n      nodes {\n        id\n        fields {\n          key\n          value\n        }\n      }\n    }\n    offerCards: metaobjects(type: "offer_card", first: 10) {\n      nodes {\n        id\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image { url }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: HomepageConfigQuery;
    variables: HomepageConfigQueryVariables;
  };
  '#graphql\n          query getDashboardCustomerId($customerAccessToken: String!) {\n            customer(customerAccessToken: $customerAccessToken) {\n              id\n            }\n          }': {
    return: GetDashboardCustomerIdQuery;
    variables: GetDashboardCustomerIdQueryVariables;
  };
  '#graphql\n      query getDashboardCustomerId($customerAccessToken: String!) {\n        customer(customerAccessToken: $customerAccessToken) {\n          id\n        }\n      }\n    ': {
    return: GetDashboardCustomerIdQuery;
    variables: GetDashboardCustomerIdQueryVariables;
  };
  '#graphql\n          query getLoyaltyCustomer($customerAccessToken: String!) {\n            customer(customerAccessToken: $customerAccessToken) { id phone email }\n          }\n          ': {
    return: GetLoyaltyCustomerQuery;
    variables: GetLoyaltyCustomerQueryVariables;
  };
  '#graphql\n          query getLoyaltyCustomerId($customerAccessToken: String!) {\n            customer(customerAccessToken: $customerAccessToken) { id }\n          }\n          ': {
    return: GetLoyaltyCustomerIdQuery;
    variables: GetLoyaltyCustomerIdQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment Customer on Customer {\n    id\n    createdAt\n    acceptsMarketing\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n    defaultAddress {\n      ...Address\n    }\n    email\n    firstName\n    lastName\n    numberOfOrders\n    phone\n    birthdate: metafield(namespace: "custom", key: "birthdate") {\n      value\n    }\n    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {\n      nodes {\n        id\n        orderNumber\n        processedAt\n        financialStatus\n        fulfillmentStatus\n        currentTotalPrice {\n          amount\n          currencyCode\n        }\n        lineItems(first: 20) {\n          nodes {\n            title\n            quantity\n            customAttributes {\n              key\n              value\n            }\n            variant {\n              id\n              image {\n                url\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  fragment Address on MailingAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    country\n    province\n    city\n    zip\n    phone\n  }\n\n  query CustomerOrders(\n    $country: CountryCode\n    $customerAccessToken: String!\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      ...CustomerOrders\n    }\n  }\n': {
    return: CustomerOrdersQuery;
    variables: CustomerOrdersQueryVariables;
  };
  '#graphql\n        query getDeleteProfileCustomerId($customerAccessToken: String!) {\n          customer(customerAccessToken: $customerAccessToken) {\n            id\n          }\n        }\n      ': {
    return: GetDeleteProfileCustomerIdQuery;
    variables: GetDeleteProfileCustomerIdQueryVariables;
  };
  '#graphql\n      query getProfileCustomerId($customerAccessToken: String!) {\n        customer(customerAccessToken: $customerAccessToken) {\n          id\n          birthdate: metafield(namespace: "custom", key: "birthdate") {\n            value\n          }\n        }\n      }\n    ': {
    return: GetProfileCustomerIdQuery;
    variables: GetProfileCustomerIdQueryVariables;
  };
  '#graphql\n  query Customer(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      ...Customer\n    }\n  }\n  #graphql\n  fragment Customer on Customer {\n    id\n    createdAt\n    acceptsMarketing\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n    defaultAddress {\n      ...Address\n    }\n    email\n    firstName\n    lastName\n    numberOfOrders\n    phone\n    birthdate: metafield(namespace: "custom", key: "birthdate") {\n      value\n    }\n    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {\n      nodes {\n        id\n        orderNumber\n        processedAt\n        financialStatus\n        fulfillmentStatus\n        currentTotalPrice {\n          amount\n          currencyCode\n        }\n        lineItems(first: 20) {\n          nodes {\n            title\n            quantity\n            customAttributes {\n              key\n              value\n            }\n            variant {\n              id\n              image {\n                url\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  fragment Address on MailingAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    country\n    province\n    city\n    zip\n    phone\n  }\n\n': {
    return: CustomerQuery;
    variables: CustomerQueryVariables;
  };
  '#graphql\n      query getCustomerForVoucher($customerAccessToken: String!) {\n        customer(customerAccessToken: $customerAccessToken) {\n          id\n          phone\n        }\n      }\n    ': {
    return: GetCustomerForVoucherQuery;
    variables: GetCustomerForVoucherQueryVariables;
  };
  '#graphql\n  query getCustomerPhoneVerifyPhone($customerAccessToken: String!) {\n    customer(customerAccessToken: $customerAccessToken) {\n      id\n      phone\n    }\n  }\n': {
    return: GetCustomerPhoneVerifyPhoneQuery;
    variables: GetCustomerPhoneVerifyPhoneQueryVariables;
  };
  '#graphql\n  query Article(\n    $articleHandle: String!\n    $blogHandle: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    blog(handle: $blogHandle) {\n      articleByHandle(handle: $articleHandle) {\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
    return: ArticleQuery;
    variables: ArticleQueryVariables;
  };
  '#graphql\n  query Blog(\n    $language: LanguageCode\n    $blogHandle: String!\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(language: $language) {\n    blog(handle: $blogHandle) {\n      title\n      seo {\n        title\n        description\n      }\n      articles(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor\n      ) {\n        nodes {\n          ...ArticleItem\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          startCursor\n          endCursor\n        }\n      }\n    }\n  }\n  fragment ArticleItem on Article {\n    author: authorV2 {\n      name\n    }\n    contentHtml\n    excerpt\n    handle\n    id\n    image {\n      id\n      altText\n      url\n      width\n      height\n    }\n    publishedAt\n    title\n    blog {\n      handle\n      title\n    }\n  }\n': {
    return: BlogQuery;
    variables: BlogQueryVariables;
  };
  '#graphql\n  query Blogs(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    blogs(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n      nodes {\n        title\n        handle\n        seo {\n          title\n          description\n        }\n      }\n    }\n  }\n': {
    return: BlogsQuery;
    variables: BlogsQueryVariables;
  };
  '#graphql\n        query GetCustomerBasic($customerAccessToken: String!) {\n          customer(customerAccessToken: $customerAccessToken) {\n            firstName\n            lastName\n            email\n          }\n        }': {
    return: GetCustomerBasicQuery;
    variables: GetCustomerBasicQueryVariables;
  };
  '#graphql\n      query GetGiftCardProduct {\n        product(id: "gid://shopify/Product/9370203521257") {\n          id\n          title\n          handle\n          availableForSale\n          variants(first: 20) {\n            nodes {\n              id\n              title\n              price {\n                amount\n                currencyCode\n              }\n              availableForSale\n            }\n          }\n        }\n      }': {
    return: GetGiftCardProductQuery;
    variables: GetGiftCardProductQueryVariables;
  };
  '#graphql\n                query GetLocationDiscountsForCart {\n                  shop {\n                    locationDiscounts: metafield(namespace: "custom", key: "location_discounts") { value }\n                    locationDiscountsAlt: metafield(namespace: "location", key: "discounts") { value }\n                  }\n                }\n              ': {
    return: GetLocationDiscountsForCartQuery;
    variables: GetLocationDiscountsForCartQueryVariables;
  };
  '#graphql\n                    query getCartCustomerDetails($customerAccessToken: String!) {\n                      customer(customerAccessToken: $customerAccessToken) {\n                        id\n                        email\n                        tags\n                      }\n                    }\n                  ': {
    return: GetCartCustomerDetailsQuery;
    variables: GetCartCustomerDetailsQueryVariables;
  };
  '#graphql\n      query checkoutCart($cartId: ID!, $language: LanguageCode, $country: CountryCode)\n        @inContext(language: $language, country: $country) {\n        cart(id: $cartId) {\n          id\n          checkoutUrl\n          note\n          cost {\n            subtotalAmount { amount currencyCode }\n            totalAmount { amount currencyCode }\n          }\n          lines(first: 100) {\n            nodes {\n              id\n              quantity\n              merchandise {\n                ... on ProductVariant {\n                  id\n                  title\n                  sku\n                  price { amount }\n                  product { title id }\n                }\n              }\n            }\n          }\n          attributes {\n            key\n            value\n          }\n        }\n      }\n    ': {
    return: CheckoutCartQuery;
    variables: CheckoutCartQueryVariables;
  };
  '#graphql\n            query checkoutCart($cartId: ID!, $language: LanguageCode, $country: CountryCode)\n              @inContext(language: $language, country: $country) {\n              cart(id: $cartId) {\n                id\n                checkoutUrl\n                note\n                cost {\n                  subtotalAmount { amount currencyCode }\n                  totalAmount { amount currencyCode }\n                }\n                lines(first: 100) {\n                  nodes {\n                    id\n                    quantity\n                    merchandise {\n                      ... on ProductVariant {\n                        id\n                        title\n                        sku\n                        price { amount }\n                        product { title id }\n                      }\n                    }\n                  }\n                }\n                attributes {\n                  key\n                  value\n                }\n              }\n            }\n          ': {
    return: CheckoutCartQuery;
    variables: CheckoutCartQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n  query Collection(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys\n    $reverse: Boolean\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      image {\n        id\n        url\n        altText\n        width\n        height\n      }\n      products(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor,\n        filters: $filters\n        sortKey: $sortKey,\n        reverse: $reverse\n      ) {\n        nodes {\n          ...HandleProductItem\n        }\n        edges {\n          cursor\n          node {\n            id\n          }\n        }\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          startCursor\n          endCursor\n        }\n      }\n    }\n  }\n': {
    return: CollectionQuery;
    variables: CollectionQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n  query FeaturedProductsFallback(\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    taggedProducts: products(first: 100, query: "tag:special-collection OR tag:special_collection OR tag:featured") {\n      nodes {\n        ...HandleProductItem\n      }\n    }\n    allProducts: products(first: 100) {\n      nodes {\n        ...HandleProductItem\n      }\n    }\n  }\n': {
    return: FeaturedProductsFallbackQuery;
    variables: FeaturedProductsFallbackQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n  query CorporateProductsFallback(\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    allProducts: products(first: 250) {\n      nodes {\n        ...HandleProductItem\n      }\n    }\n  }\n': {
    return: CorporateProductsFallbackQuery;
    variables: CorporateProductsFallbackQueryVariables;
  };
  '#graphql\n  fragment FilterProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n  }\n  query CollectionFilter(\n    $handle: String!\n    $filters: [ProductFilter!]\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      products(first: 100, filters: $filters) {\n        nodes {\n          ...FilterProductItem\n        }\n      }\n    }\n  }\n': {
    return: CollectionFilterQuery;
    variables: CollectionFilterQueryVariables;
  };
  '#graphql\n  query CatalogSearch(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n    $query: String!\n    $filters: [ProductFilter!]\n    $sortKey: SearchSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    search(\n      query: $query, \n      first: $first, \n      last: $last, \n      before: $startCursor, \n      after: $endCursor,\n      types: [PRODUCT],\n      productFilters: $filters,\n      sortKey: $sortKey,\n      reverse: $reverse\n    ) {\n      productFilters {\n        id\n        label\n        type\n        values {\n          id\n          label\n          count\n          input\n        }\n      }\n      nodes {\n        ...on Product {\n           ...AllProductItem\n        }\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n    collections(first: 50) {\n      nodes {\n        id\n        handle\n        title\n        products(first: 250) {\n          nodes {\n            id\n          }\n        }\n      }\n    }\n  }\n  #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n': {
    return: CatalogSearchQuery;
    variables: CatalogSearchQueryVariables;
  };
  '#graphql\n    #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n    query CorporateProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n      products(first: 25, query: "tag:corporate") {\n        nodes {\n          ...CorporateProductItem\n        }\n      }\n      collections(first: 20) {\n        nodes {\n          id\n          handle\n          title\n          description\n          image {\n            id\n            url\n            altText\n          }\n        }\n      }\n    }\n  ': {
    return: CorporateProductsQuery;
    variables: CorporateProductsQueryVariables;
  };
  '#graphql\n  query CakeAttributes($language: LanguageCode) @inContext(language: $language) {\n    cakeAttributes: metaobjects(type: "cake_attribute", first: 250) {\n      nodes {\n        id\n        attributeType: field(key: "attribute_type") { value }\n        nameEn: field(key: "name_english") { value }\n        nameAr: field(key: "name_arabic") { value }\n        priceDelta: field(key: "price_delta") { value }\n        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }\n        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }\n        imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }\n        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }\n      }\n    }\n    toppingDesigns: metaobjects(type: "cake_topping_design", first: 250) {\n      nodes {\n        id\n        topping: field(key: "topping") {\n          value\n          reference {\n            ... on Metaobject {\n              id\n            }\n          }\n        }\n        shape: field(key: "shape") {\n          value\n          reference {\n            ... on Metaobject {\n              id\n            }\n          }\n        }\n        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }\n        imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }\n        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }\n      }\n    }\n    cakeSettings: metaobjects(type: "cake_settings", first: 1) {\n      nodes {\n        preparationHours: field(key: "preparation_hours") { value }\n      }\n    }\n  }\n': {
    return: CakeAttributesQuery;
    variables: CakeAttributesQueryVariables;
  };
  '#graphql\n        query getShippingCustomer($customerAccessToken: String!) {\n          customer(customerAccessToken: $customerAccessToken) {\n            firstName\n            lastName\n            email\n            phone\n            defaultAddress {\n              address1\n              address2\n              city\n              country\n              zip\n              phone\n              firstName\n              lastName\n            }\n          }\n        }\n      ': {
    return: GetShippingCustomerQuery;
    variables: GetShippingCustomerQueryVariables;
  };
  '#graphql\n  query ExportCatalogSearch(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n    $query: String!\n    $filters: [ProductFilter!]\n    $sortKey: SearchSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    exportCollection: collection(handle: "export-products") {\n      id\n      title\n      products(\n        first: $first\n        last: $last\n        before: $startCursor\n        after: $endCursor\n        filters: $filters\n      ) {\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        nodes {\n          id\n          title\n          handle\n          availableForSale\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          featuredImage {\n            id\n            url\n            altText\n            width\n            height\n          }\n          variants(first: 1) {\n            nodes {\n              id\n              availableForSale\n              price {\n                amount\n                currencyCode\n              }\n              compareAtPrice {\n                amount\n                currencyCode\n              }\n            }\n          }\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          startCursor\n          endCursor\n        }\n      }\n    }\n    search(\n      query: $query, \n      first: $first, \n      last: $last, \n      before: $startCursor, \n      after: $endCursor,\n      types: [PRODUCT],\n      productFilters: $filters,\n      sortKey: $sortKey,\n      reverse: $reverse\n    ) {\n      productFilters {\n        id\n        label\n        type\n        values {\n          id\n          label\n          count\n          input\n        }\n      }\n      nodes {\n        ...on Product {\n          id\n          title\n          handle\n          availableForSale\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          featuredImage {\n            id\n            url\n            altText\n            width\n            height\n          }\n          variants(first: 1) {\n            nodes {\n              id\n              availableForSale\n              price {\n                amount\n                currencyCode\n              }\n              compareAtPrice {\n                amount\n                currencyCode\n              }\n            }\n          }\n        }\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n    collections(first: 50) {\n      nodes {\n        id\n        handle\n        title\n      }\n    }\n  }\n': {
    return: ExportCatalogSearchQuery;
    variables: ExportCatalogSearchQueryVariables;
  };
  '#graphql\n  query ExportCollectionFilter(\n    $handle: String!\n    $filters: [ProductFilter!]\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      products(first: 100, filters: $filters) {\n        nodes {\n          id\n          title\n          handle\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          featuredImage {\n            id\n            url\n            altText\n            width\n            height\n          }\n          variants(first: 1) {\n            nodes {\n              id\n              availableForSale\n              price {\n                amount\n                currencyCode\n              }\n              compareAtPrice {\n                amount\n                currencyCode\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: ExportCollectionFilterQuery;
    variables: ExportCollectionFilterQueryVariables;
  };
  '#graphql\n              query CheckOrderReviews {\n                orderReviews: metaobjects(type: "order_review", first: 250) {\n                  nodes {\n                    id\n                    fields { key value }\n                  }\n                }\n                storefrontReviews: metaobjects(type: "storefront_review", first: 250) {\n                  nodes {\n                    id\n                    fields { key value }\n                  }\n                }\n              }\n            ': {
    return: CheckOrderReviewsQuery;
    variables: CheckOrderReviewsQueryVariables;
  };
  '#graphql\n            query GetFeedbackLocations {\n              locations(first: 250) {\n                nodes {\n                  id\n                  name\n                  name_in_arabic: metafield(namespace: "custom", key: "name_in_arabic") { value }\n                }\n              }\n            }\n          ': {
    return: GetFeedbackLocationsQuery;
    variables: GetFeedbackLocationsQueryVariables;
  };
  '#graphql\n    #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n    query GiftingProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n      collections(first: 100) {\n        nodes {\n          id\n          title\n          handle\n          image {\n            url\n            altText\n          }\n        }\n      }\n      products(first: 200, query: "tag:gifting OR tag:gift") {\n        nodes {\n          ...GiftingProductItem\n        }\n      }\n    }\n  ': {
    return: GiftingProductsQuery;
    variables: GiftingProductsQueryVariables;
  };
  '#graphql\n    #graphql\n  fragment OccasionsProductItem on Product {\n    id\n    handle\n    title\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    availableForSale\n    variants(first: 10) {\n      nodes {\n        id\n        title\n        availableForSale\n        quantityAvailable\n        selectedOptions {\n          name\n          value\n        }\n        price {\n          amount\n          currencyCode\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n    tags\n  }\n\n    query OccasionsProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n      collections(first: 100) {\n        nodes {\n          id\n          title\n          handle\n          image {\n            url\n            altText\n          }\n        }\n      }\n      products(first: 200, query: "tag:wedding OR tag:ramadan OR tag:birthdays OR tag:eid OR tag:new-baby OR tag:national-day OR tag:mothers-day OR tag:graduation OR tag:occasion") {\n        nodes {\n          ...OccasionsProductItem\n        }\n      }\n    }\n  ': {
    return: OccasionsProductsQuery;
    variables: OccasionsProductsQueryVariables;
  };
  '#graphql\n  query HandlePage(\n    $language: LanguageCode,\n    $country: CountryCode,\n    $handle: String!\n  )\n  @inContext(language: $language, country: $country) {\n    page(handle: $handle) {\n      id\n      handle\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: HandlePageQuery;
    variables: HandlePageQueryVariables;
  };
  '#graphql\n  query TermsPage(\n    $language: LanguageCode,\n    $country: CountryCode,\n    $handle: String!\n  )\n  @inContext(language: $language, country: $country) {\n    page(handle: $handle) {\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: TermsPageQuery;
    variables: TermsPageQueryVariables;
  };
  '#graphql\n  fragment Policy on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n  query Policy(\n    $country: CountryCode\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $refundPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...Policy\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...Policy\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...Policy\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...Policy\n      }\n    }\n  }\n': {
    return: PolicyQuery;
    variables: PolicyQueryVariables;
  };
  '#graphql\n  fragment PolicyItem on ShopPolicy {\n    id\n    title\n    handle\n  }\n  query Policies ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    shop {\n      privacyPolicy {\n        ...PolicyItem\n      }\n      shippingPolicy {\n        ...PolicyItem\n      }\n      termsOfService {\n        ...PolicyItem\n      }\n      refundPolicy {\n        ...PolicyItem\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesQuery;
    variables: PoliciesQueryVariables;
  };
  '#graphql\n  query predictiveSearch(\n    $query: String!\n    $limit: Int\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    predictiveSearch(query: $query, limit: $limit, types: [PRODUCT, QUERY, COLLECTION], searchableFields: [TITLE, PRODUCT_TYPE, VENDOR, VARIANTS_SKU]) {\n      queries {\n        text\n        styledText\n      }\n      products {\n        id\n        title\n        handle\n        isGiftCard\n        productType\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n            price {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n      collections {\n        id\n        title\n        handle\n        image {\n            url\n            altText\n            width\n            height\n        }\n      }\n    }\n  }\n': {
    return: PredictiveSearchQuery;
    variables: PredictiveSearchQueryVariables;
  };
  '#graphql\n            query ProductHandle($id: ID!) {\n                product(id: $id) {\n                    handle\n                }\n            }\n        ': {
    return: ProductHandleQuery;
    variables: ProductHandleQueryVariables;
  };
  '#graphql\n            query GetProductReviews {\n              metaobjects(type: "storefront_review", first: 250) {\n                nodes {\n                  fields {\n                    key\n                    value\n                  }\n                }\n              }\n            }\n          ': {
    return: GetProductReviewsQuery;
    variables: GetProductReviewsQueryVariables;
  };
  '#graphql\n              query CustomerPurchases($customerAccessToken: String!) {\n                customer(customerAccessToken: $customerAccessToken) {\n                  orders(first: 50) {\n                    nodes {\n                      lineItems(first: 50) {\n                        nodes {\n                          variant {\n                            product {\n                              id\n                            }\n                          }\n                        }\n                      }\n                    }\n                  }\n                }\n              }\n            ': {
    return: CustomerPurchasesQuery;
    variables: CustomerPurchasesQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductDetailRecommendedProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n\n  query Product(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n    $selectedOptions: [SelectedOptionInput!]!\n\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...Product\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    productType\n    isGiftCard\n    tags\n    collections(first: 10) {\n      nodes {\n        id\n        title\n        handle\n        title_in_arabic: metafield(namespace: "custom", key: "title_in_arabic") {\n          value\n        }\n        title_ar: metafield(namespace: "custom", key: "title_ar") {\n          value\n        }\n        name_in_arabic: metafield(namespace: "custom", key: "name_in_arabic") {\n          value\n        }\n        name_ar: metafield(namespace: "custom", key: "name_ar") {\n          value\n        }\n        leadTime: metafield(namespace: "custom", key: "delivery_lead_time") {\n          value\n        }\n      }\n    }\n    name_in_arabic: metafield(namespace: "custom", key: "name_in_arabic") {\n      value\n    }\n    title_in_arabic: metafield(namespace: "custom", key: "title_in_arabic") {\n      value\n    }\n    arabic_name: metafield(namespace: "custom", key: "arabic_name") {\n      value\n    }\n    arabic_title: metafield(namespace: "custom", key: "arabic_title") {\n      value\n    }\n    name_ar: metafield(namespace: "custom", key: "name_ar") {\n      value\n    }\n    title_ar: metafield(namespace: "custom", key: "title_ar") {\n      value\n    }\n    bundle_components: metafield(namespace: "custom", key: "bundle_components") {\n      references(first: 20) {\n        nodes {\n          ... on Product {\n            id\n            title\n            handle\n            featuredImage {\n              url\n              altText\n            }\n            variants(first: 1) {\n              nodes {\n                sku\n                price {\n                  amount\n                  currencyCode\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    options {\n      name\n      optionValues {\n        name\n      }\n    }\n    addons: metafield(namespace: "custom", key: "product_addons") {\n    references(first: 10) {\n      nodes {\n        ... on Product {\n          id\n          title\n          handle\n          availableForSale\n          variants(first: 1) {\n            nodes {\n              id\n              sku\n              price {\n                amount\n                currencyCode\n              }\n              image {\n                url\n                altText\n                width\n                height\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  upsell_products: metafield(namespace: "custom", key: "upsell_products") {\n    references(first: 10) {\n      nodes {\n        ... on Product {\n          id\n          title\n          handle\n          availableForSale\n          featuredImage {\n            url\n            altText\n            width\n            height\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          variants(first: 1) {\n            nodes {\n              id\n              sku\n              availableForSale\n              price {\n                amount\n                currencyCode\n              }\n              image {\n                url\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  product_upsells: metafield(namespace: "custom", key: "product_upsells") {\n    references(first: 10) {\n      nodes {\n        ... on Product {\n          id\n          title\n          handle\n          availableForSale\n          featuredImage {\n            url\n            altText\n            width\n            height\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          variants(first: 1) {\n            nodes {\n              id\n              sku\n              availableForSale\n              price {\n                amount\n                currencyCode\n              }\n              image {\n                url\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n\n      # --- ADDED FOR VISIBILITY SCHEDULING ---\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    next_season_date: metafield(namespace: "custom", key: "next_season_date") {\n      value\n    }\n    seasonal_message: metafield(namespace: "custom", key: "seasonal_message") {\n      value\n    }\n    nutrition: metafield(namespace: "custom", key: "nutrition") {\n      value\n    }\n    allergens: metafield(namespace: "custom", key: "allergens") {\n      value\n    }\n    calories: metafield(namespace: "custom", key: "calories") {\n      value\n    }\n    prep_time: metafield(namespace: "custom", key: "prep_time") {\n      value\n    }\n    servings: metafield(namespace: "custom", key: "servings") {\n      value\n    }\n    estimated_delivery: metafield(namespace: "custom", key: "estimated_delivery") {\n      value\n    }\n    delivery_override: metafield(namespace: "custom", key: "delivery_lead_time") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    vegan: metafield(namespace: "custom", key: "vegan") {\n      value\n    }\n    lactose_free: metafield(namespace: "custom", key: "lactose_free") {\n      value\n    }\n    gluten_free: metafield(namespace: "custom", key: "gluten_free") {\n      value\n    }\n    restock_date: metafield(namespace: "custom", key: "restock_date") {\n      value\n    }\n    expected_restock_date: metafield(namespace: "custom", key: "expected_restock_date") {\n      value\n    }\n    related_products: metafield(namespace: "custom", key: "related_products") {\n      references(first: 4) {\n        nodes {\n          ... on Product {\n            ...ProductDetailRecommendedProduct\n          }\n          ... on ProductVariant {\n            id\n            title\n            image {\n              id\n              url\n              altText\n              width\n              height\n            }\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            product {\n              ...ProductDetailRecommendedProduct\n            }\n          }\n        }\n      }\n    }\n    # ---------------------------------------\n\n    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    variants(first: 100) {\n      nodes {\n        ...ProductVariant\n      }\n    }\n    seo {\n      description\n      title\n    }\n    images(first: 10) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n    components(first: 20) {\n      nodes {\n        quantity\n        productVariant {\n          id\n          title\n          sku\n          price {\n            amount\n            currencyCode\n          }\n          image {\n            url\n            altText\n          }\n          product {\n            id\n            title\n            handle\n            featuredImage {\n              url\n              altText\n            }\n          }\n        }\n      }\n    }\n    storeAvailability(first: 250) {\n      nodes {\n        available\n        location {\n          id\n          name\n        }\n      }\n    }\n  }\n\n\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  query ProductReviews($type: String!) {\n    metaobjects(type: $type, first: 250) {\n      nodes {\n        fields {\n          key\n          value\n        }\n      }\n    }\n  }\n': {
    return: ProductReviewsQuery;
    variables: ProductReviewsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductVariants on Product {\n    variants(first: 250) {\n      nodes {\n        ...ProductVariant\n      }\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n    components(first: 20) {\n      nodes {\n        quantity\n        productVariant {\n          id\n          title\n          sku\n          price {\n            amount\n            currencyCode\n          }\n          image {\n            url\n            altText\n          }\n          product {\n            id\n            title\n            handle\n            featuredImage {\n              url\n              altText\n            }\n          }\n        }\n      }\n    }\n    storeAvailability(first: 250) {\n      nodes {\n        available\n        location {\n          id\n          name\n        }\n      }\n    }\n  }\n\n\n  query ProductVariants(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...ProductVariants\n    }\n  }\n': {
    return: ProductVariantsQuery;
    variables: ProductVariantsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductDetailRecommendedProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n\n  query ProductRecommendations(\n    $country: CountryCode\n    $language: LanguageCode\n    $productId: ID!\n  ) @inContext(country: $country, language: $language) {\n    productRecommendations(productId: $productId, intent: RELATED) {\n      ...ProductDetailRecommendedProduct\n    }\n  }\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductDetailRecommendedProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n\n  query CollectionProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $collectionId: ID!\n  ) @inContext(country: $country, language: $language) {\n    collection(id: $collectionId) {\n      products(first: 5) {\n        nodes {\n          ...ProductDetailRecommendedProduct\n        }\n      }\n    }\n  }\n': {
    return: CollectionProductsQuery;
    variables: CollectionProductsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductDetailRecommendedProduct on Product {\n    id\n    title\n    handle\n    availableForSale\n    productType\n    isGiftCard\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n      value\n    }\n    visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n      value\n    }\n    average_rating: metafield(namespace: "custom", key: "average_rating") {\n      value\n    }\n    rating_count: metafield(namespace: "custom", key: "rating_count") {\n      value\n    }\n    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {\n      value\n      reference {\n        ... on ProductVariant {\n          id\n        }\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        id\n        title\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n        storeAvailability(first: 250) {\n          nodes {\n            available\n            location {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n\n  query NewestProducts(\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    products(first: 4, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...ProductDetailRecommendedProduct\n      }\n    }\n  }\n': {
    return: NewestProductsQuery;
    variables: NewestProductsQueryVariables;
  };
  '#graphql\n  query getPromotionalProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n    heroMeta: metaobjects(type: "promotions_hero", first: 1) {\n      nodes {\n        id\n        handle\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image {\n                url\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n    bogoMeta: metaobjects(type: "promotions_bogo", first: 1) {\n      nodes {\n        id\n        fields {\n          key\n          value\n        }\n      }\n    }\n    gridMeta: metaobjects(type: "promotions_grid", first: 1) {\n      nodes {\n        id\n        fields {\n          key\n          value\n        }\n      }\n    }\n    bannerMeta: metaobjects(type: "promotions_banner", first: 1) {\n      nodes {\n        id\n        fields {\n          key\n          value\n        }\n      }\n    }\n    products(first: 50) {\n      nodes {\n        id\n        handle\n        title\n        tags\n        availableForSale\n        featuredImage {\n          url\n          altText\n          width\n          height\n        }\n        priceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n        compareAtPriceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n        variants(first: 10) {\n          nodes {\n            id\n            title\n            availableForSale\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            storeAvailability(first: 250) {\n              nodes {\n                available\n                location {\n                  id\n                  name\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: GetPromotionalProductsQuery;
    variables: GetPromotionalProductsQueryVariables;
  };
  '#graphql\n  query QualityPolicyPage(\n    $language: LanguageCode,\n    $country: CountryCode,\n    $handle: String!\n  )\n  @inContext(language: $language, country: $country) {\n    page(handle: $handle) {\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: QualityPolicyPageQuery;
    variables: QualityPolicyPageQueryVariables;
  };
  '#graphql\n                query CollectionIds($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n                    collection(handle: $handle) {\n                        products(first: 250) {\n                            nodes {\n                                id\n                            }\n                        }\n                    }\n                }\n            ': {
    return: CollectionIdsQuery;
    variables: CollectionIdsQueryVariables;
  };
  '#graphql\n    fragment SearchProduct on Product {\n    __typename\n    handle\n    id\n    publishedAt\n    title\n    availableForSale\n    trackingParameters\n    vendor\n    tags\n    productType\n    isGiftCard\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 1) {\n      nodes {\n        id\n        title\n        availableForSale\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  query Search(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $query: String!\n    $startCursor: String\n    $productFilters: [ProductFilter!]\n    $sortKey: SearchSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    products: search(\n      after: $endCursor\n      before: $startCursor\n      first: $first\n      last: $last\n      query: $query\n      productFilters: $productFilters\n      sortKey: $sortKey\n      reverse: $reverse\n      types: [PRODUCT]\n    ) {\n      nodes {\n        ...SearchProduct\n      }\n      productFilters {\n        id\n        label\n        type\n        values {\n          id\n          label\n          count\n          input\n        }\n      }\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n    }\n    collections: collections(first: 100) {\n      nodes {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: SearchQuery;
    variables: SearchQueryVariables;
  };
  '#graphql\n        query getVouchersCustomer($customerAccessToken: String!) {\n          customer(customerAccessToken: $customerAccessToken) {\n            id\n            phone\n            email\n          }\n        }\n      ': {
    return: GetVouchersCustomerQuery;
    variables: GetVouchersCustomerQueryVariables;
  };
  '#graphql\n              query getCustomerId($customerAccessToken: String!) {\n                customer(customerAccessToken: $customerAccessToken) {\n                  id\n                  email\n                }\n              }\n            ': {
    return: GetCustomerIdQuery;
    variables: GetCustomerIdQueryVariables;
  };
  '#graphql\n                          query CustomerAddressesForLocationId($customerAccessToken: String!) {\n                            customer(customerAccessToken: $customerAccessToken) {\n                              addresses(first: 250) {\n                                nodes {\n                                  id\n                                  firstName\n                                  lastName\n                                  address1\n                                  address2\n                                  city\n                                  country\n                                  phone\n                                }\n                              }\n                            }\n                          }\n                        ': {
    return: CustomerAddressesForLocationIdQuery;
    variables: CustomerAddressesForLocationIdQueryVariables;
  };
  '#graphql\n            query getCustomerEnrollment($customerAccessToken: String!) {\n              customer(customerAccessToken: $customerAccessToken) { createdAt }\n            }\n            ': {
    return: GetCustomerEnrollmentQuery;
    variables: GetCustomerEnrollmentQueryVariables;
  };
  '#graphql\n      query getProductsForWishlist($ids: [ID!]!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {\n        nodes(ids: $ids) {\n          ... on Product {\n            id\n            title\n            handle\n            availableForSale\n            featuredImage {\n              id\n              altText\n              url\n              width\n              height\n            }\n            priceRange {\n              minVariantPrice {\n                amount\n                currencyCode\n              }\n              maxVariantPrice {\n                amount\n                currencyCode\n              }\n            }\n            compareAtPriceRange {\n              minVariantPrice {\n                amount\n                currencyCode\n              }\n            }\n            visibility_start: metafield(namespace: "custom", key: "visibility_start") {\n              value\n            }\n            visibility_end: metafield(namespace: "custom", key: "visibility_end") {\n              value\n            }\n            variants(first: 10) {\n              nodes {\n                id\n                title\n                availableForSale\n                quantityAvailable\n                selectedOptions {\n                  name\n                  value\n                }\n                price {\n                  amount\n                  currencyCode\n                }\n                storeAvailability(first: 250) {\n                  nodes {\n                    available\n                    location {\n                      id\n                      name\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    ': {
    return: GetProductsForWishlistQuery;
    variables: GetProductsForWishlistQueryVariables;
  };
  '#graphql\n            query getCustomerEnrollmentDate($customerAccessToken: String!) {\n              customer(customerAccessToken: $customerAccessToken) { createdAt }\n            }\n            ': {
    return: GetCustomerEnrollmentDateQuery;
    variables: GetCustomerEnrollmentDateQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation customerAddressUpdate($address: MailingAddressInput!, $customerAccessToken: String!, $id: ID!) {\n    customerAddressUpdate(address: $address, customerAccessToken: $customerAccessToken, id: $id) {\n      customerAddress { id }\n      customerUserErrors { message }\n    }\n  }\n': {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {\n    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {\n      customerUserErrors { message }\n      deletedCustomerAddressId\n    }\n  }\n': {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  '#graphql\n  mutation customerDefaultAddressUpdate($addressId: ID!, $customerAccessToken: String!) {\n    customerDefaultAddressUpdate(addressId: $addressId, customerAccessToken: $customerAccessToken) {\n      customer { defaultAddress { id } }\n      customerUserErrors { message }\n    }\n  }\n': {
    return: CustomerDefaultAddressUpdateMutation;
    variables: CustomerDefaultAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressCreate($address: MailingAddressInput!, $customerAccessToken: String!) {\n    customerAddressCreate(address: $address, customerAccessToken: $customerAccessToken) {\n      customerAddress { id }\n      customerUserErrors { message }\n    }\n  }\n': {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  '#graphql\n  mutation customerUpdate(\n    $customerAccessToken: String!,\n    $customer: CustomerUpdateInput!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customer {\n        acceptsMarketing\n        email\n        firstName\n        id\n        lastName\n        phone\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
  '#graphql\n  mutation customerActivate(\n    $id: ID!,\n    $input: CustomerActivateInput!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerActivateMutation;
    variables: CustomerActivateMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateMutation;
    variables: CustomerAccessTokenCreateMutationVariables;
  };
  '#graphql\n  mutation customerRecover($email: String!) {\n    customerRecover(email: $email) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerRecoverMutation;
    variables: CustomerRecoverMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreateRegister($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerAccessToken { accessToken expiresAt }\n      customerUserErrors { code field message }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateRegisterMutation;
    variables: CustomerAccessTokenCreateRegisterMutationVariables;
  };
  '#graphql\n  mutation customerReset(\n    $id: ID!,\n    $input: CustomerResetInput!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerReset(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerResetMutation;
    variables: CustomerResetMutationVariables;
  };
  '#graphql\n  mutation customerPhoneUpdateVerifyPhone($customerAccessToken: String!, $customer: CustomerUpdateInput!) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customer {\n        id\n        phone\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerPhoneUpdateVerifyPhoneMutation;
    variables: CustomerPhoneUpdateVerifyPhoneMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreateSocial($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerAccessToken { accessToken expiresAt }\n      customerUserErrors { code field message }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateSocialMutation;
    variables: CustomerAccessTokenCreateSocialMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
