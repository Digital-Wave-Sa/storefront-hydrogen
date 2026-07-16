export class SaadeddinApi {
  private baseUrl: string;
  private token?: string;

  constructor(env: any, token?: string) {
    this.baseUrl = env.CUSTOM_API_URL || 'https://api.pryvexapls.com';
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

  // ─── AUTHENTICATION ──────────────────────────────────────────────────────────

  async requestOtp(phone: string, flowType: 'register' | 'login') {
    return this.api('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, flowType }),
    });
  }

  async verifyOtp(phone: string, code: string | number, flowType: 'register' | 'login') {
    return this.api('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code: String(code), flowType }),
    });
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
    return this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code: String(code) }),
    });
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
}
