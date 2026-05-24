import { useRouteLoaderData } from 'react-router';
import { useState } from 'react';

export function SocialLogins() {
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialClick = (provider: string, url: string) => {
    setLoadingProvider(provider);
    window.location.href = url;
  };

  return (
    <div className="social-logins-container mt-8 mb-6 flex flex-col gap-3.5 w-full">
      <div className="flex items-center justify-between w-full my-2">
        <span className="h-[1px] bg-gray-200 flex-1" />
        <span className="text-[11px] font-bold text-gray-400 px-4 uppercase tracking-wider">
          {isEn ? 'Or continue with' : 'أو الاستمرار بواسطة'}
        </span>
        <span className="h-[1px] bg-gray-200 flex-1" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-between items-center">
        {/* Google Button */}
        <button
          type="button"
          onClick={() => handleSocialClick('google', '/api/auth/google')}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-3 w-full bg-white border border-gray-200 hover:border-gray-300 rounded-[14px] px-5 h-[52px] font-bold text-sm text-gray-700 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 flex-1 shadow-sm"
        >
          {loadingProvider === 'google' ? (
            <span className="w-5 h-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          <span>{isEn ? 'Google' : 'جوجل'}</span>
        </button>

        {/* Apple Button */}
        <button
          type="button"
          onClick={() => handleSocialClick('apple', '/api/auth/apple')}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-3 w-full bg-[#1a1a1a] text-white hover:bg-black rounded-[14px] px-5 h-[52px] font-bold text-sm transition-all duration-200 disabled:opacity-50 flex-1 shadow-sm"
        >
          {loadingProvider === 'apple' ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.27-.59 2.94-1.39z"/>
            </svg>
          )}
          <span>{isEn ? 'Apple' : 'آبل'}</span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          onClick={() => handleSocialClick('facebook', '/api/auth/facebook')}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-3 w-full bg-[#1877F2] text-white hover:bg-[#166FE5] rounded-[14px] px-5 h-[52px] font-bold text-sm transition-all duration-200 disabled:opacity-50 flex-1 shadow-sm"
        >
          {loadingProvider === 'facebook' ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
          <span>{isEn ? 'Facebook' : 'فيسبوك'}</span>
        </button>
      </div>
    </div>
  );
}
