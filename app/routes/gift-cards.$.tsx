import {
  data as json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';

interface Transaction {
  id: string;
  operation: 'CREATE' | 'ACTIVATE' | 'REDEEM' | 'TOPUP' | 'VOID';
  amount?: number;
  timestamp: string;
}

interface GiftCard {
  code: string;
  currentBalance: number;
  phone: string | null;
  status: 'active' | 'inactive' | 'voided';
  transactions: Transaction[];
}

// In-memory persistent database survival across Vite HMR reloads
const globalAny = globalThis as any;
if (!globalAny.__giftCards) {
  globalAny.__giftCards = new Map<string, GiftCard>();
}
const giftCards: Map<string, GiftCard> = globalAny.__giftCards;

// Pre-populate standard mock codes for QA and UI verification
if (giftCards.size === 0) {
  giftCards.set('GC-WELCOME50', {
    code: 'GC-WELCOME50',
    currentBalance: 50,
    phone: null,
    status: 'inactive',
    transactions: [
      {
        id: 'tx-init-1',
        operation: 'CREATE',
        amount: 50,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  giftCards.set('GC-LOYALTY100', {
    code: 'GC-LOYALTY100',
    currentBalance: 100,
    phone: '0501234567',
    status: 'active',
    transactions: [
      {
        id: 'tx-init-2',
        operation: 'CREATE',
        amount: 100,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'tx-init-3',
        operation: 'ACTIVATE',
        amount: 100,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
    segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GC-${segment1}-${segment2}`;
}

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/(?:[a-z]{2}\/)?gift-cards/, '');

  // 1. GET /gift-cards/by-phone/:phone
  const byPhoneMatch = path.match(/^\/by-phone\/([\w+.-]+)$/);
  if (byPhoneMatch) {
    const rawPhone = byPhoneMatch[1];
    // Support matching both standard and cleaned formats
    const targetPhone = rawPhone.replace(/\D/g, '');
    const matchedCards: any[] = [];
    let totalBalance = 0;

    for (const card of giftCards.values()) {
      if (card.phone && card.phone.replace(/\D/g, '') === targetPhone) {
        matchedCards.push({
          code: card.code,
          currentBalance: card.currentBalance,
          status: card.status,
        });
        totalBalance += card.currentBalance;
      }
    }

    return json({
      success: true,
      data: {
        phone: rawPhone,
        cards: matchedCards,
        totalBalance,
      },
    });
  }

  // 2. GET /gift-cards/:code/transactions
  const txMatch = path.match(/^\/([\w-]+)\/transactions$/);
  if (txMatch) {
    const code = txMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }
    return json({
      success: true,
      data: {
        code,
        transactions: card.transactions,
      },
    });
  }

  // 3. GET /gift-cards/:code
  const codeMatch = path.match(/^\/([\w-]+)$/);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }
    return json({
      success: true,
      data: {
        code: card.code,
        currentBalance: card.currentBalance,
        phone: card.phone,
        status: card.status,
      },
    });
  }

  return json({success: false, error: 'Invalid endpoint'}, {status: 400});
}

export async function action({request}: ActionFunctionArgs) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/(?:[a-z]{2}\/)?gift-cards/, '');
  const method = request.method.toUpperCase();

  if (method !== 'POST') {
    return json({success: false, error: 'Method not allowed'}, {status: 405});
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {}

  // 1. POST /gift-cards (Create - Admin Only)
  if (path === '/' || path === '') {
    const adminKey = request.headers.get('X-Admin-Key');
    if (adminKey !== 'admin-secret-key') {
      return json({success: false, error: 'Admin key required'}, {status: 401});
    }

    const initialBalance = parseFloat(body.initialBalance) || 0;
    const newCode = generateCode();

    const newCard: GiftCard = {
      code: newCode,
      currentBalance: initialBalance,
      phone: null,
      status: 'inactive',
      transactions: [
        {
          id: `tx-${Date.now()}`,
          operation: 'CREATE',
          amount: initialBalance,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    giftCards.set(newCode, newCard);

    return json({
      success: true,
      data: {
        code: newCode,
        currentBalance: initialBalance,
        note: 'Share with customer',
      },
    });
  }

  // 2. POST /gift-cards/:code/activate
  const activateMatch = path.match(/^\/([\w-]+)\/activate$/);
  if (activateMatch) {
    const code = activateMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }

    if (card.status !== 'inactive' || card.phone) {
      return json({success: false, error: 'Already activated'}, {status: 409});
    }

    const phone = body.phone?.trim();
    if (!phone) {
      return json(
        {success: false, error: 'Phone number is required'},
        {status: 400},
      );
    }

    card.phone = phone;
    card.status = 'active';
    card.transactions.push({
      id: `tx-${Date.now()}`,
      operation: 'ACTIVATE',
      amount: card.currentBalance,
      timestamp: new Date().toISOString(),
    });

    return json({
      success: true,
      data: {
        code: card.code,
        phone: card.phone,
        message: 'Activated — bound to your phone',
      },
    });
  }

  // 3. POST /gift-cards/:code/redeem
  const redeemMatch = path.match(/^\/([\w-]+)\/redeem$/);
  if (redeemMatch) {
    const code = redeemMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }

    if (card.status !== 'active') {
      return json(
        {success: false, error: 'Gift card not activated yet'},
        {status: 409},
      );
    }

    const phone = body.phone?.trim();
    if (!phone || card.phone?.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
      return json(
        {
          success: false,
          error: 'This card belongs to a different phone number',
        },
        {status: 403},
      );
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return json({success: false, error: 'Invalid amount'}, {status: 400});
    }

    if (card.currentBalance < amount) {
      return json(
        {success: false, error: 'Insufficient balance'},
        {status: 422},
      );
    }

    card.currentBalance -= amount;
    card.transactions.push({
      id: `tx-${Date.now()}`,
      operation: 'REDEEM',
      amount,
      timestamp: new Date().toISOString(),
    });

    return json({
      success: true,
      data: {
        operation: 'REDEEM',
        code: card.code,
        amount,
        currentBalance: card.currentBalance,
        phone: card.phone,
      },
    });
  }

  // 4. POST /gift-cards/:code/top-up
  const topUpMatch = path.match(/^\/([\w-]+)\/top-up$/);
  if (topUpMatch) {
    const code = topUpMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }

    if (card.status !== 'active') {
      return json(
        {success: false, error: 'Gift card not activated yet'},
        {status: 409},
      );
    }

    const phone = body.phone?.trim();
    if (!phone || card.phone?.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
      return json(
        {
          success: false,
          error: 'This card belongs to a different phone number',
        },
        {status: 403},
      );
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return json({success: false, error: 'Invalid amount'}, {status: 400});
    }

    card.currentBalance += amount;
    card.transactions.push({
      id: `tx-${Date.now()}`,
      operation: 'TOPUP',
      amount,
      timestamp: new Date().toISOString(),
    });

    return json({
      success: true,
      data: {
        operation: 'TOPUP',
        code: card.code,
        amount,
        currentBalance: card.currentBalance,
        phone: card.phone,
      },
    });
  }

  // 5. POST /gift-cards/:code/void
  const voidMatch = path.match(/^\/([\w-]+)\/void$/);
  if (voidMatch) {
    const code = voidMatch[1].toUpperCase();
    const card = giftCards.get(code);
    if (!card) {
      return json(
        {success: false, error: 'Gift card not found'},
        {status: 404},
      );
    }

    if (card.status !== 'active') {
      return json(
        {success: false, error: 'Gift card not activated yet'},
        {status: 409},
      );
    }

    const phone = body.phone?.trim();
    if (!phone || card.phone?.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
      return json(
        {
          success: false,
          error: 'This card belongs to a different phone number',
        },
        {status: 403},
      );
    }

    card.currentBalance = 0;
    card.status = 'voided';
    card.transactions.push({
      id: `tx-${Date.now()}`,
      operation: 'VOID',
      timestamp: new Date().toISOString(),
    });

    return json({
      success: true,
      data: {
        operation: 'VOID',
        code: card.code,
        currentBalance: 0,
        phone: card.phone,
        status: 'voided',
      },
    });
  }

  return json({success: false, error: 'Invalid endpoint'}, {status: 400});
}
