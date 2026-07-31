import React, { createContext, useContext, useEffect, useState } from 'react';

export interface WishlistItem {
  id: string;
  title: string;
  handle: string;
  image?: {
    url: string;
    altText?: string;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ 
  children,
  customerId 
}: { 
  children: React.ReactNode;
  customerId?: string;
}) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isModifiedRef = React.useRef(false);

  // 1. Initial Load: Merge LocalStorage and Cloud
  useEffect(() => {
    let isMounted = true;

    const initWishlist = async () => {
      const localSaved = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null;
      let currentWishlist: WishlistItem[] = [];
      
      if (localSaved) {
        try {
          currentWishlist = JSON.parse(localSaved) as WishlistItem[];
        } catch (e) {}
      }

      if (customerId) {
        try {
          const formattedId = customerId.startsWith('gid://') ? customerId : `gid://shopify/Customer/${customerId}`;
          const response = await fetch(`/api/wishlist?customerId=${encodeURIComponent(formattedId)}`);
          if (response.ok) {
            const data = await response.json() as any;
            if (data.wishlist && Array.isArray(data.wishlist)) {
              const cloudWishlist: WishlistItem[] = data.wishlist;
              const mergedMap = new Map<string, WishlistItem>();
              
              // Cloud items take priority when logged in; add any local items not in cloud
              cloudWishlist.forEach(item => mergedMap.set(item.id, item));
              currentWishlist.forEach(item => {
                if (!mergedMap.has(item.id)) {
                  mergedMap.set(item.id, item);
                }
              });
              
              currentWishlist = Array.from(mergedMap.values());
            }
          }
        } catch (e) {
          console.error('Failed to sync with cloud on load', e);
        }
      }

      if (isMounted) {
        setWishlist(currentWishlist);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
        }
        setIsLoaded(true);
      }
    };

    initWishlist();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  // 2. Save to LocalStorage immediately on change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isLoaded]);

  // 3. Sync to Cloud ONLY when user modifies wishlist
  useEffect(() => {
    if (!isLoaded || !customerId || !isModifiedRef.current) return;

    const syncTimeout = setTimeout(async () => {
      try {
        const formattedId = customerId.startsWith('gid://') ? customerId : `gid://shopify/Customer/${customerId}`;
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: formattedId, wishlist }),
        });
        isModifiedRef.current = false;
      } catch (e) {
        console.error('Cloud sync failed', e);
      }
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [wishlist, customerId, isLoaded]);

  const toggleWishlist = (item: WishlistItem) => {
    isModifiedRef.current = true;
    setWishlist((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isInWishlist = (id: string) => {
    return wishlist.some((i) => i.id === id);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
