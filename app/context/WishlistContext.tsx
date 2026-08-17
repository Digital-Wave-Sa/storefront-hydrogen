import React, { createContext, useContext, useEffect, useState } from 'react';

export interface WishlistItem {
  id: string;
  variantId?: string;
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

function getStorageKey(customerId?: string) {
  if (customerId) {
    return `wishlist_${customerId}`;
  }
  return 'wishlist_guest';
}

export function WishlistProvider({ 
  children,
  customerId 
}: { 
  children: React.ReactNode;
  customerId?: string;
}) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync / Load wishlist whenever customerId changes or on initial mount
  useEffect(() => {
    let isMounted = true;

    // Clean up legacy unscoped 'wishlist' key to prevent cross-account pollution
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('wishlist');
      } catch (e) {}
    }

    const initWishlist = async () => {
      const storageKey = getStorageKey(customerId);
      const localSaved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      let currentWishlist: WishlistItem[] = [];
      
      if (localSaved) {
        try {
          currentWishlist = JSON.parse(localSaved) as WishlistItem[];
        } catch (e) {}
      }

      // If logged in, fetch authoritative cloud wishlist for this customer
      if (customerId) {
        try {
          const formattedId = customerId.startsWith('gid://') ? customerId : `gid://shopify/Customer/${customerId}`;
          const response = await fetch(`/api/wishlist?customerId=${encodeURIComponent(formattedId)}`);
          if (response.ok) {
            const data = (await response.json()) as any;
            if (data.wishlist && Array.isArray(data.wishlist)) {
              currentWishlist = data.wishlist;
            }
          }
        } catch (e) {
          console.error('Failed to sync wishlist with cloud on load', e);
        }
      }

      if (isMounted) {
        setWishlist(currentWishlist);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(currentWishlist));
          } catch (e) {}
        }
        setIsLoaded(true);
      }
    };

    initWishlist();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  // Save to scoped LocalStorage on wishlist changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        const storageKey = getStorageKey(customerId);
        localStorage.setItem(storageKey, JSON.stringify(wishlist));
      } catch (e) {}
    }
  }, [wishlist, isLoaded, customerId]);

  const syncToCloud = async (newWishlist: WishlistItem[]) => {
    if (!customerId) return;
    try {
      const formattedId = customerId.startsWith('gid://') ? customerId : `gid://shopify/Customer/${customerId}`;
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: formattedId, wishlist: newWishlist }),
      });
    } catch (e) {
      console.error('Cloud sync failed', e);
    }
  };

  const toggleWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      const updated = exists
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item];
      
      if (typeof window !== 'undefined') {
        try {
          const storageKey = getStorageKey(customerId);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {}
      }
      syncToCloud(updated);
      return updated;
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
    return {
      wishlist: [],
      toggleWishlist: () => {},
      isInWishlist: () => false,
    };
  }
  return context;
}
