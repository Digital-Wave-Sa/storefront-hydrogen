interface MockLoyaltyStore {
  [identifier: string]: number;
}

function normalizeIdentifier(id: string): string {
  if (id.includes('@')) {
    return id.toLowerCase().trim();
  }
  let cleaned = id.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.startsWith('00966')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.startsWith('966') && cleaned.length > 9) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

if (!(globalThis as any).__mockLoyaltyStore) {
  (globalThis as any).__mockLoyaltyStore = {
    '0591234567': 3500, // Seed user 00966591234567 (0591234567) with 3500 points
    'dev@example.com': 2500 // Seed local mock customer with 2500 points
  } as MockLoyaltyStore;
}

const store = (globalThis as any).__mockLoyaltyStore;

export function getMockPoints(id: string): number {
  const cleanId = normalizeIdentifier(id);
  if (store[cleanId] === undefined) {
    store[cleanId] = 2500; // Default points balance for other users
  }
  return store[cleanId];
}

export function redeemMockPoints(id: string, points: number): boolean {
  const cleanId = normalizeIdentifier(id);
  const current = getMockPoints(cleanId);
  if (current >= points) {
    store[cleanId] = current - points;
    console.log(`[Mock CRM] Redeemed ${points} points for ${cleanId}. New balance: ${store[cleanId]}`);
    return true;
  }
  return false;
}

export function refundMockPoints(id: string, points: number): void {
  const cleanId = normalizeIdentifier(id);
  const current = getMockPoints(cleanId);
  store[cleanId] = current + points;
  console.log(`[Mock CRM] Refunded ${points} points for ${cleanId}. New balance: ${store[cleanId]}`);
}
