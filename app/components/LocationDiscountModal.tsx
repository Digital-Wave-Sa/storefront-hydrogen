interface LocationDiscountModalProps {
  branchId?: string | null;
  branchName?: string | null;
  region?: string | null;
  locationDiscounts?: any;
  isEn?: boolean;
}

export function LocationDiscountModal(_props: LocationDiscountModalProps) {
  // Disabled as per user request: Location promotions are shown exclusively on the offers page (/promotions)
  return null;
}
