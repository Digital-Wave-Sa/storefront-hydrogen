/**
 * Mock Aramex Rate API endpoint
 * Route: /api/aramex-rate
 *
 * When real Aramex credentials are available, replace the mock logic in
 * `calculateAramexRate()` with a real call to the Aramex Rate Calculator API.
 *
 * Aramex Rate Calculator API docs:
 * https://developer.aramex.com/docs/api/rate-calculator
 *
 * Required credentials (store in .env):
 *   ARAMEX_USERNAME=...
 *   ARAMEX_PASSWORD=...
 *   ARAMEX_ACCOUNT_NUMBER=...
 *   ARAMEX_ACCOUNT_ENTITY=...  (e.g. RUH)
 *   ARAMEX_ACCOUNT_PIN=...
 *   ARAMEX_ACCOUNT_COUNTRY_CODE=SA
 */

import {data, type ActionFunctionArgs} from 'react-router';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AramexRateRequest {
  destinationCountry: string; // ISO 2-letter code e.g. "AE", "KW"
  destinationCity: string;
  destinationZip?: string;
  weightKg: number; // total shipment weight
}

interface AramexRateResponse {
  success: boolean;
  rate?: number; // Total shipping cost in SAR
  currency?: string;
  deliveryDays?: number;
  serviceType?: string;
  error?: string;
}

// ─── Mock rates table (SAR) ────────────────────────────────────────────────
// Replace with real Aramex API when credentials are ready.

const MOCK_RATES_BY_COUNTRY: Record<
  string,
  {base: number; perKg: number; days: number}
> = {
  AE: {base: 120, perKg: 18, days: 2}, // UAE
  KW: {base: 140, perKg: 20, days: 3}, // Kuwait
  QA: {base: 135, perKg: 19, days: 3}, // Qatar
  BH: {base: 130, perKg: 18, days: 3}, // Bahrain
  OM: {base: 145, perKg: 21, days: 4}, // Oman
  JO: {base: 155, perKg: 22, days: 4}, // Jordan
  EG: {base: 160, perKg: 22, days: 5}, // Egypt
  GB: {base: 280, perKg: 35, days: 7}, // UK
  US: {base: 320, perKg: 40, days: 8}, // USA
  CA: {base: 330, perKg: 42, days: 9}, // Canada
  DE: {base: 290, perKg: 37, days: 7}, // Germany
  FR: {base: 295, perKg: 37, days: 7}, // France
};

const DEFAULT_RATE = {base: 350, perKg: 45, days: 10};

// ─── Real Aramex API call (commented out until credentials available) ──────

/*
async function calculateAramexRateLive(req: AramexRateRequest, env: any): Promise<AramexRateResponse> {
  const payload = {
    ClientInfo: {
      UserName: env.ARAMEX_USERNAME,
      Password: env.ARAMEX_PASSWORD,
      Version: 'v1',
      AccountNumber: env.ARAMEX_ACCOUNT_NUMBER,
      AccountPin: env.ARAMEX_ACCOUNT_PIN,
      AccountEntity: env.ARAMEX_ACCOUNT_ENTITY,
      AccountCountryCode: env.ARAMEX_ACCOUNT_COUNTRY_CODE,
      Source: 24,
    },
    OriginAddress: {
      Line1: 'Saadeddin Pastry HQ',
      City: 'Riyadh',
      CountryCode: 'SA',
    },
    DestinationAddress: {
      City: req.destinationCity,
      CountryCode: req.destinationCountry,
      PostCode: req.destinationZip || '',
    },
    ShipmentDetails: {
      Dimensions: { Length: 40, Width: 30, Height: 20, Unit: 'CM' },
      ActualWeight: { Value: req.weightKg, Unit: 'KG' },
      ProductGroup: 'EXP',
      ProductType: 'PPX',
      PaymentType: 'P',
      Services: 'CODS',
      NumberOfPieces: 1,
    },
  };

  const res = await fetch('https://ws.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc/json/CalculateRate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json() as any;

  if (json?.HasErrors || !json?.TotalAmount?.Value) {
    return { success: false, error: json?.Notifications?.[0]?.Message || 'Aramex rate error' };
  }

  return {
    success: true,
    rate: json.TotalAmount.Value,
    currency: 'SAR',
    deliveryDays: json.TransitDays || 5,
    serviceType: 'Priority Parcel Express',
  };
}
*/

// ─── Mock implementation ────────────────────────────────────────────────────

async function calculateAramexRateMock(
  req: AramexRateRequest,
): Promise<AramexRateResponse> {
  // Simulate a short network delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  const country = (req.destinationCountry || '').toUpperCase();
  const table = MOCK_RATES_BY_COUNTRY[country] || DEFAULT_RATE;
  const weight = Math.max(req.weightKg || 1, 0.5);
  const rate = Math.round(table.base + table.perKg * weight);

  return {
    success: true,
    rate,
    currency: 'SAR',
    deliveryDays: table.days,
    serviceType: 'Aramex Priority Parcel Express',
  };
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({success: false, error: 'Method not allowed'}, {status: 405});
  }

  let body: AramexRateRequest;
  try {
    body = (await request.json()) as AramexRateRequest;
  } catch {
    return data({success: false, error: 'Invalid JSON body'}, {status: 400});
  }

  if (!body.destinationCountry || !body.weightKg) {
    return data(
      {success: false, error: 'destinationCountry and weightKg are required'},
      {status: 400},
    );
  }

  try {
    // Switch to calculateAramexRateLive() when credentials are ready:
    const result = await calculateAramexRateMock(body);
    return data(result);
  } catch (err: any) {
    console.error('[ARAMEX_RATE] Error:', err);
    return data(
      {success: false, error: err?.message || 'Failed to calculate rate'},
      {status: 500},
    );
  }
}
