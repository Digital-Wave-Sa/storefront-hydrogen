/**
 * SEO metadata utilities
 */

export function getShopTitle(title: string, matches: any[]): string {
  const rootMatch = matches.find((m) => m.id === 'root');
  const shopName = rootMatch?.data?.header?.shop?.name || 'Saadeddin Pastry';
  return title ? `${shopName} | ${title}` : shopName;
}
