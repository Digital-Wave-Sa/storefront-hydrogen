export class SaadeddinApi {
  private baseUrl: string;
  private token?: string;

  constructor(env: any, token?: string) {
    this.baseUrl = env.CUSTOM_API_URL || 'https://api.saadeddin.top';
    this.token = token;
  }

  private async api(endpoint: string, opts: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    
    const data = await (res.json() as Promise<any>).catch(() => ({}));

    if (!res.ok || data.success === false) {
      /**
       * `error` is not always a string. The rate-limit reply sends an array —
       * ["Too many attempts. Try again in 60 seconds.", 60] — and handing that
       * to `new Error()` stringified it with the array's own comma, so the
       * customer was shown "…in 60 seconds.,60".
       *
       * That trailing value is the retry-after in seconds. It is pulled out
       * and kept on the error rather than pasted into the sentence, so callers
       * can tell the customer when to come back.
       */
      const raw = data.error;
      let message = '';
      let retryAfter: number | undefined;

      if (typeof raw === 'string') {
        message = raw;
      } else if (Array.isArray(raw)) {
        message = String(raw[0] ?? '');
        const tail = Number(raw[1]);
        if (Number.isFinite(tail)) retryAfter = tail;
      } else if (raw && typeof raw === 'object') {
        message = String((raw as any).message ?? (raw as any).error ?? '');
        const tail = Number((raw as any).retryAfter);
        if (Number.isFinite(tail)) retryAfter = tail;
      }

      const err = new Error(
        message || `Request failed with status ${res.status}`,
      );
      (err as any).status = res.status;
      (err as any).data = data.data;
      if (retryAfter !== undefined) (err as any).retryAfter = retryAfter;
      throw err;
    }
    
    return data.data;
  }

  private getPhoneCandidates(phone: string): string[] {
    const candidates: string[] = [phone];
    if (phone.startsWith('+')) {
      candidates.push(phone.replace('+', ''));
    }
    const match = phone.match(/^\+?(\d{1,4})/);
    if (match) {
      const prefix = phone.startsWith('+') ? `+${match[1]}` : match[1];
      if (phone.startsWith(prefix)) {
        const local = phone.substring(prefix.length);
        if (local && !local.startsWith('0')) {
          candidates.push(`+${match[1]}0${local}`);
          candidates.push(`${match[1]}0${local}`);
        }
      }
    }
    return Array.from(new Set(candidates));
  }

  // ─── AUTHENTICATION ──────────────────────────────────────────────────────────

  async requestOtp(phone: string, flowType: 'register' | 'login') {
    return this.api('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, flowType }),
    });
  }

  async verifyOtp(phone: string, code: string | number, flowType: 'register' | 'login') {
    const candidates = this.getPhoneCandidates(phone);
    let lastErr: any = null;

    for (let i = 0; i < candidates.length; i++) {
      try {
        console.log(`[verifyOtp] Trying candidate: ${candidates[i]}`);
        return await this.api('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ phone: candidates[i], code: String(code), flowType }),
        });
      } catch (err: any) {
        lastErr = err;
        const errMsg = err.message || '';
        if (!errMsg.includes('No OTP found') && !errMsg.includes('not found')) {
          throw err;
        }
      }
    }
    throw lastErr;
  }

  async register(
    data: {
      phone: string;
      name: string;
      email: string;
      password?: string;
      accountType: string;
      otpToken: string;
      companyName?: string;
      taxNumber?: string;
      companyAddress?: string;
      birthDate?: string;
    },
    idempotencyKey: string
  ) {
    return this.api('/auth/register', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
  }

  async login(phone: string, code: string | number) {
    const candidates = this.getPhoneCandidates(phone);
    let lastErr: any = null;

    for (let i = 0; i < candidates.length; i++) {
      try {
        console.log(`[login] Trying candidate: ${candidates[i]}`);
        return await this.api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone: candidates[i], code: String(code) }),
        });
      } catch (err: any) {
        lastErr = err;
        const errMsg = err.message || '';
        if (!errMsg.includes('No OTP found') && !errMsg.includes('not found')) {
          throw err;
        }
      }
    }
    throw lastErr;
  }

  async logout() {
    return this.api('/auth/logout', { method: 'POST' });
  }

  // ─── PROFILE ─────────────────────────────────────────────────────────────────

  async getProfile() {
    return this.api('/auth/me');
  }

  async updateProfile(data: { birthDate?: string; city?: string }) {
    return this.api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addAddress(data: { label: string; street: string; city: string }) {
    return this.api('/auth/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── CHECKOUT & BALANCE ──────────────────────────────────────────────────────

  async getBalance(phone: string) {
    return this.api(`/checkout/balance/${phone}`);
  }

  async initiateCheckout(payload: {
    cart: any;
    phone: string;
    pointsToRedeem?: number;
    giftCardCode?: string;
    voucherCode?: string;
    deliveryType: 'Pick Up' | 'Delivery';
    address?: any;
    customerName?: string;
    idempotencyKey?: string;
  }) {
    // Generate an idempotency key if not provided
    if (!payload.idempotencyKey) {
      payload.idempotencyKey = `order-${Date.now()}`;
    }
    return this.api('/checkout/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Tell the CRM what state a cart is in, so it knows whether to chase it.
   *
   * ACTIVE starts the recovery clock, CLEARED means the shopper emptied it
   * themselves, COMPLETED means they bought it. COMPLETED was declared here
   * from the start and never sent by anything: the cart action that does the
   * syncing has long finished by the time Shopify's hosted checkout takes the
   * payment, so the CRM's last word on every successful cart was ACTIVE -- and
   * a shopper could be chased over a cart they had already paid for. It is now
   * sent from the `orders/create` webhook.
   *
   * The branch fields are optional because only the cart knows them. A bakery
   * order is made at a branch, and a recovery message that cannot say which
   * one -- or tell whether the items are still in stock there -- is guessing.
   */
  async syncCartToCrm(payload: {
    phone: string;
    customerName?: string;
    cartId: string;
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    subtotal: number;
    currency: string;
    cartUrl: string;
    status: 'ACTIVE' | 'CLEARED' | 'COMPLETED';
    /** 'ar' or 'en' -- which language to write to the shopper in. */
    locale?: string;
    /** Numeric Shopify location id of the branch the cart is priced for. */
    locationId?: string;
    branchName?: string;
    fulfillmentType?: string;
    /** Sent with COMPLETED, so the CRM can see which order closed the cart. */
    orderName?: string;
    orderNumber?: string;
  }) {
    return this.api('/cart/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── GIFT CARDS ──────────────────────────────────────────────────────────────

  async activateGiftCard(code: string, phone: string) {
    return this.api(`/gift-cards/${code}/activate`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async redeemGiftCard(code: string, phone: string, amount: number) {
    return this.api(`/gift-cards/${code}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ phone, amount }),
    });
  }

  async getGiftCardByPhone(phone: string) {
    return this.api(`/gift-cards/by-phone/${phone}`);
  }

  // ─── STORE CREDIT (CHECKOUT INTEGRATION) ────────────────────────────────────

  async applyStoreCredit(payload: {
    phone: string;
    amount: number;
    cartId: string;
  }) {
    const url = `${this.baseUrl}/api/orders/apply-credit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({
        phone: payload.phone,
        amount: payload.amount,
        cart_id: payload.cartId,
      }),
    });

    const data = await (res.json() as Promise<any>).catch(() => ({}));
    return data;
  }

  // ─── REVIEWS & CRM ───────────────────────────────────────────────────────────

  /**
   * Every product rating in an order, not only the complaints.
   *
   * `/reviews/negative` is an ERP complaints inbox: the storefront only ever
   * called it for 1 and 2 stars, so a 3, 4 or 5 star rating was written to a
   * Shopify metaobject and forwarded nowhere. The business could see what
   * customers disliked and nothing they liked.
   *
   * This is the other endpoint: the whole order's ratings in one call, keyed on
   * SKU, which the middleware forwards to the ERP. Negative ratings still go to
   * the complaints inbox as well -- the two are different jobs, one asking for
   * action and one recording a score.
   *
   * Authenticated, unlike the complaints inbox. The secret belongs on the
   * server; nothing here is reachable from the browser.
   */
  async sendOrderRatings(payload: {
    orderId: string;
    orderNumber: string;
    comment?: string;
    language?: string;
    items: Array<{productSku: string; rating: number}>;
  }) {
    try {
      const body = {
        orderId: String(payload.orderId),
        orderNumber: String(payload.orderNumber),
        ...(payload.comment ? {comment: payload.comment} : {}),
        createdAt: new Date().toISOString(),
        language: payload.language === 'en' ? 'en' : 'ar',
        items: payload.items,
      };

      console.log(
        '📤 [MIDDLEWARE OUTBOX] POST /orders/ratings',
        JSON.stringify(body),
      );

      if (!this.token) {
        console.warn(
          '[REVIEWS] No middleware token set — /orders/ratings will be sent unauthenticated and may be rejected.',
        );
      }

      const res = await fetch(`${this.baseUrl}/orders/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}),
        },
        body: JSON.stringify(body),
      });

      const resData = await (res.json() as Promise<any>).catch(() => ({}));
      console.log(
        `📥 [MIDDLEWARE RESPONSE] /orders/ratings status ${res.status}`,
        JSON.stringify(resData).slice(0, 300),
      );
      return resData;
    } catch (err: any) {
      /** Best effort: a rating that cannot be forwarded is still recorded. */
      console.warn('[REVIEWS] Order ratings sync notice:', err?.message || err);
      return null;
    }
  }

  /**
   * The ERP complaints inbox, in the shape the middleware documents.
   *
   * This used to send `order_number`, `customer_email`, `customer_phone` and
   * `submitted_at`. The documented contract asks for `order_id`,
   * `customer_name`, `branch_rating` and `language` instead -- so the order
   * identifier arrived under a key the middleware does not read, and the
   * complaint had no order attached to it. The call is fire-and-forget with a
   * catch that only warns, so nothing ever said so.
   *
   * Contact details are deliberately no longer sent: they are not in the
   * contract, and the ERP resolves the customer from the order.
   */
  async sendNegativeReview(payload: {
    orderId: string;
    rating: number;
    comment: string;
    customerName?: string;
    branchName?: string;
    branchRating?: number | string;
    language?: string;
    productTitle?: string;
    productHandle?: string;
  }) {
    try {
      const bodyPayload: Record<string, any> = {
        order_id: String(payload.orderId),
        customer_name: payload.customerName || 'عميل سعد الدين',
        branch_name: payload.branchName || 'General',
        // A string in the documented example, unlike `rating`.
        branch_rating: String(payload.branchRating ?? payload.rating),
        rating: payload.rating,
        comment: payload.comment,
        language: payload.language === 'en' ? 'en' : 'ar',
      };

      /**
       * Kept beyond the contract: without them a product complaint cannot be
       * told from a branch complaint, since both carry the same order and the
       * same branch.
       */
      if (payload.productTitle) {
        bodyPayload.product_name = payload.productTitle;
      }
      if (payload.productHandle) {
        bodyPayload.product_handle = payload.productHandle;
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 [MIDDLEWARE OUTBOX] POST /reviews/negative');
      console.log('📦 Payload Body:', JSON.stringify(bodyPayload, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const res = await fetch(`${this.baseUrl}/reviews/negative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(bodyPayload),
      });

      const resData = await (res.json() as Promise<any>).catch(() => ({}));
      console.log(`📥 [MIDDLEWARE RESPONSE] Status: ${res.status}`, JSON.stringify(resData, null, 2));
      return resData;
    } catch (err: any) {
      console.warn('[REVIEWS] Middleware negative review sync notice:', err?.message || err);
      return null;
    }
  }
}
