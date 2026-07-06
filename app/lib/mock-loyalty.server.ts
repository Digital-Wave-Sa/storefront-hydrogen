interface MockLoyaltyStore {
  [phone: string]: number;
}

if (!(globalThis as any).__mockLoyaltyStore) {
  (globalThis as any).__mockLoyaltyStore = {} as MockLoyaltyStore;
}

const store = (globalThis as any).__mockLoyaltyStore;

export function getMockPoints(phone: string): number {
  const cleanPhone = phone.replace(/\D/g, '');
  if (store[cleanPhone] === undefined) {
    store[cleanPhone] = 2500; // Default points balance for prototype preview
  }
  return store[cleanPhone];
}

export function redeemMockPoints(phone: string, points: number): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  const current = getMockPoints(cleanPhone);
  if (current >= points) {
    store[cleanPhone] = current - points;
    console.log(`[Mock CRM] Redeemed ${points} points for phone ${cleanPhone}. New balance: ${store[cleanPhone]}`);
    return true;
  }
  return false;
}

export function refundMockPoints(phone: string, points: number): void {
  const cleanPhone = phone.replace(/\D/g, '');
  const current = getMockPoints(cleanPhone);
  store[cleanPhone] = current + points;
  console.log(`[Mock CRM] Refunded ${points} points for phone ${cleanPhone}. New balance: ${store[cleanPhone]}`);
}
