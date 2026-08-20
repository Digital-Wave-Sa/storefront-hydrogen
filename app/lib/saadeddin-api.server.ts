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
      const err = new Error(data.error || `Request failed with status ${res.status}`);
      (err as any).status = res.status;
      (err as any).data = data.data;
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

  // ─── REVIEWS & CRM ───────────────────────────────────────────────────────────

  async sendNegativeReview(payload: {
    orderNumber: string;
    rating: number;
    comment: string;
    productTitle?: string;
    productHandle?: string;
    customerEmail?: string;
    customerPhone?: string;
    branchName?: string;
  }) {
    try {
      const bodyPayload: Record<string, any> = {
        order_number: payload.orderNumber,
        rating: payload.rating,
        comment: payload.comment,
        customer_email: payload.customerEmail || 'customer@saadeddin.com',
        customer_phone: payload.customerPhone || '+966500000000',
        branch_name: payload.branchName || 'General',
        submitted_at: new Date().toISOString(),
      };

      if (payload.productTitle) {
        bodyPayload.product_name = payload.productTitle;
      }
      if (payload.productHandle) {
        bodyPayload.product_handle = payload.productHandle;
      }

      return await this.api('/reviews/negative', {
        method: 'POST',
        body: JSON.stringify(bodyPayload),
      });
    } catch (err: any) {
      console.warn('[REVIEWS] Middleware negative review sync notice:', err?.message || err);
      return null;
    }
  }
}
