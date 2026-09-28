/**
 * Saadeddin Pastry CRM & ERP API Synchronization Client
 */
export interface CRMVoucherPayload {
  code: string;
  value: number;
  valueType: string;
  minSubtotal: number;
  usageLimit: number | null;
  endsAt: string | null;
  orderType: string;
  targetProductId: string | null;
  targetCustomerEmail: string | null;
  branchId: string | null;
  createdAt: string;
}

export type CRMVoucherSyncResult =
  | {success: true; transactionId: string | null; syncedAt: string}
  | {success: false; skipped?: boolean; error: string};

/**
 * Sends a new voucher to the CRM.
 *
 * `CRM_API_KEY` must come from the environment. There used to be a key
 * written into this file as a fallback, which put it in the repository and in
 * every copy of the code; it is gone. Without the variable the call is not
 * made at all — the voucher itself is already in Shopify, so nothing breaks —
 * and the result says so.
 *
 * Failures used to come back as `success: true` with a made-up transaction id
 * ("offline fallback"), so the staff email announced a sync that never
 * happened. The result is now the truth, and the caller words the email
 * from it.
 */
export async function syncVoucherToCRM({
  voucher,
  env,
}: {
  voucher: CRMVoucherPayload;
  env: any;
}): Promise<CRMVoucherSyncResult> {
  const crmUrl = env?.CRM_API_URL || 'https://crm.saadeddin.com/api/v1/vouchers/sync';
  const crmApiKey = env?.CRM_API_KEY;

  if (!crmApiKey) {
    console.warn(
      `[CRM] CRM_API_KEY is not set — voucher ${voucher.code} was created in Shopify but not sent to the CRM.`,
    );
    return {success: false, skipped: true, error: 'CRM_API_KEY is not set'};
  }

  try {
    const response = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${crmApiKey}`,
        'X-Saadeddin-Source': 'Storefront-Admin',
      },
      body: JSON.stringify(voucher),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`CRM responded with HTTP ${response.status}`);
    }

    const result = (await response.json().catch(() => ({}))) as any;
    return {
      success: true,
      transactionId: result?.transactionId ? String(result.transactionId) : null,
      syncedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    const message = error?.name === 'TimeoutError' ? 'CRM did not answer within 10 s' : error?.message || String(error);
    console.warn(`[CRM] Voucher ${voucher.code} was not synced: ${message}`);
    return {success: false, error: message};
  }
}
