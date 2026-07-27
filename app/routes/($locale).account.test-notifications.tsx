import { data, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useState } from 'react';
import { getNotificationTemplates } from '~/lib/notification_templates';
import type { OrderStage, Language } from '~/lib/notification_templates';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const stage = (url.searchParams.get('stage') as OrderStage) || 'CONFIRMED';
  const lang = (url.searchParams.get('lang') as Language) || 'AR';

  const mockOrder = {
    orderNumber: '12345',
    customerName: 'Ahmad Al-Saadi',
    trackingUrl: 'https://track.saadeddin.com/12345',
    totalPrice: '250.00 SAR',
    items: [
      { title: 'Mixed Baklava Large Box', quantity: 1, price: '150.00 SAR' },
      { title: 'Premium Arabic Coffee 250g', quantity: 2, price: '100.00 SAR' },
    ],
    expectedDelivery: 'Today, 6:00 PM - 8:00 PM'
  };

  const templates = getNotificationTemplates(stage, lang, mockOrder);
  return data({ templates, stage, lang });
}

export default function NotificationPreview() {
  const { templates, stage, lang } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');

  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '30px', background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h1 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#234745' }}>Notification Template Preview</h1>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>STAGE</label>
              <select 
                value={stage} 
                onChange={(e) => window.location.href = `?stage=${e.target.value}&lang=${lang}`}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>LANGUAGE</label>
              <select 
                value={lang} 
                onChange={(e) => window.location.href = `?stage=${stage}&lang=${e.target.value}`}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="AR">Arabic (RTL)</option>
                <option value="EN">English (LTR)</option>
              </select>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setActiveTab('email')}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: activeTab === 'email' ? '#234745' : '#eee',
                  color: activeTab === 'email' ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                EMAIL
              </button>
              <button 
                onClick={() => setActiveTab('sms')}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: activeTab === 'sms' ? '#234745' : '#eee',
                  color: activeTab === 'sms' ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                SMS
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'email' ? (
          <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '15px 25px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
               <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
               <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
               <div style={{ marginLeft: '20px', fontSize: '13px', color: '#666' }}>Subject: {templates.email.subject}</div>
            </div>
            <iframe 
              srcDoc={templates.email.html} 
              style={{ width: '100%', height: '800px', border: 'none' }}
              title="Email Preview"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
            <div style={{ 
              width: '300px', 
              height: '600px', 
              background: '#000', 
              borderRadius: '40px', 
              padding: '15px', 
              position: 'relative',
              boxShadow: '0 30px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: '30px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ padding: '40px 15px 15px', background: '#f2f2f7', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: '#ccc', borderRadius: '50%', margin: '0 auto 5px' }}></div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Saadeddin</div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    background: '#e9e9eb', 
                    padding: '12px 16px', 
                    borderRadius: '18px', 
                    fontSize: '14px', 
                    lineHeight: '1.4',
                    color: '#000',
                    maxWidth: '90%',
                    direction: lang === 'AR' ? 'rtl' : 'ltr'
                  }}>
                    {templates.sms}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}





