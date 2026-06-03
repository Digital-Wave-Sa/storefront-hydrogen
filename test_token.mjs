import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const shop = process.env.PUBLIC_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKENS;

async function testGenericOrders() {
  console.log(`Testing generic orders fetch...`);
  try {
    const res = await fetch(`https://${shop}/admin/api/2023-04/orders.json?limit=1`, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    });
    
    if (res.ok) {
      const { orders } = await res.json();
      console.log(`Successfully fetched ${orders?.length || 0} orders from the general endpoint.`);
    } else {
      console.error('Failed orders fetch:', res.status, await res.text());
    }
  } catch (e) {
    console.error('Network Error:', e.message);
  }
}

testGenericOrders();
