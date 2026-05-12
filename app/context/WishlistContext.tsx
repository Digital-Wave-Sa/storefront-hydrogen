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

  // 1. Initial Load: Merge LocalStorage and Cloud
  useEffect(() => {
    const initWishlist = async () => {
      // Load from LocalStorage
      const localSaved = localStorage.getItem('wishlist');
      let currentWishlist: WishlistItem[] = [];
      
      if (localSaved) {
        try {
          currentWishlist = JSON.parse(localSaved);
        } catch (e) {
          console.error('Failed to parse local wishlist', e);
        }
      }

      // If logged in, fetch from Cloud and merge
      if (customerId) {
        try {
          const response = await fetch(`/api/wishlist?customerId=${customerId}`);
          const data = await response.json();
          if (data.wishlist && Array.isArray(data.wishlist)) {
            // Merge logic: combine unique IDs
            const cloudWishlist: WishlistItem[] = data.wishlist;
            const mergedMap = new Map();
            
            // Local items take priority for metadata, cloud items added if missing
            currentWishlist.forEach(item => mergedMap.set(item.id, item));
            cloudWishlist.forEach(item => {
              if (!mergedMap.has(item.id)) {
                mergedMap.set(item.id, item);
              }
            });
            
            currentWishlist = Array.from(mergedMap.values());
          }
        } catch (e) {
          console.error('Failed to sync with cloud on load', e);
        }
      }

      setWishlist(currentWishlist);
      setIsLoaded(true);
    };

    initWishlist();
  }, [customerId]);

  // 2. Save to LocalStorage immediately on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isLoaded]);

  // 3. Debounced Cloud Sync (Only if logged in)
  useEffect(() => {
    if (!isLoaded || !customerId) return;

    const syncTimeout = setTimeout(async () => {
      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, wishlist }),
        });
      } catch (e) {
        console.error('Cloud sync failed', e);
      }
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [wishlist, customerId, isLoaded]);

  const toggleWishlist = (item: WishlistItem) => {
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
