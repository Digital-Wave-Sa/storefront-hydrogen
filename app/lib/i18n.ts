import type {I18nBase} from '@shopify/hydrogen';

export interface I18nLocale extends I18nBase {
  pathPrefix: string;
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  let firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  // If request URL has no locale prefix (e.g. /cart, /api/products), check Referer header
  if (!['EN', 'AR'].includes(firstPathPart)) {
    const referer = request.headers.get('Referer') || request.headers.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer, url.origin);
        const refPathPart = refUrl.pathname.split('/')[1]?.toUpperCase() ?? '';
        if (['EN', 'AR'].includes(refPathPart)) {
          firstPathPart = refPathPart;
        }
      } catch (e) {
        // ignore invalid referer URL
      }
    }
  }

  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let [language, country]: I18nFromUrl = ['AR', 'SA'];

  const validLanguages = ['EN', 'AR'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    const [langPart, countryPart] = firstPathPart.split('-');
    if (validLanguages.includes(langPart)) {
      pathPrefix = '/' + langPart.toLowerCase();
      language = langPart as I18nLocale['language'];
      country = countryPart as I18nLocale['country'];
    }
  } else if (/^[A-Z]{2}$/i.test(firstPathPart)) {
    if (validLanguages.includes(firstPathPart)) {
      pathPrefix = firstPathPart === 'EN' ? '/en' : '';
      language = firstPathPart as I18nLocale['language'];
      country = 'SA'; // Default country
    }
  }

  return {language: language.toUpperCase() as I18nLocale['language'], country: country.toUpperCase() as I18nLocale['country'], pathPrefix};
}

export type Locale = 'en' | 'ar';

export const translations = {
    en: {
        common: {
            home: 'Home',
            products: 'Products',
            back: 'Back',
            search: 'Search for chocolate, cakes, gifts...',
            cart: 'Cart',
            account: 'Account',
            favorites: 'Favorites',
            points: 'points',
            pointsVal: '3,450 points',
            subtotal: 'Subtotal',
            delivery: 'Delivery',
            pickup: 'Pickup',
            selectBranch: 'Select Branch',
            olayaBranch: 'Olaya Branch',
            addAddress: 'Add Address',
            save: 'Save',
            cancel: 'Cancel',
            vatInclusive: 'VAT Inclusive',
            inStock: 'In Stock',
            reviews: 'Reviews',
            quantity: 'Quantity',
            addToCart: 'Add to Cart',
            buyNow: 'Buy Now',
            freeDelivery: 'Free delivery for orders above 300',
            installments: 'Installments with Tamara & Tabby',
            pointsEarn: 'Earn points with every order',
            since: 'Since 1979 — Authentic Taste',
            shopNow: 'Shop Now',
            designYourCake: 'Design Your Cake',
            discoverCollection: 'Discover our premium chocolate, cakes, and oriental sweets — with fast delivery and a rewarding loyalty program.',
            bestExperience: 'Get the best experience for the taste of',
            chocolateAndSweets: 'Chocolate & Sweets',
            offers: 'Offers',
            occasions: 'Occasions',
            shoppingCart: 'Shopping Cart',
            discountCode: 'Discount Code',
            total: 'Total',
            subtotalNotice: 'Taxes included. Shipping calculated at checkout.',
            viewCart: 'View Cart',
            checkout: 'Checkout',
            emptyCart: 'Your shopping cart is empty',
            emptyCartNotice: 'There are still many great products you can add.',
            continueShopping: 'Continue Shopping',
            spendMore: 'Spend',
            moreForFreeShipping: 'more for free shipping!',
            limitedQuantity: 'Limited quantity — Checkout in',
            deliverToAddress: 'Deliver to this address',
            storePickup: 'Store Pickup',
            searchBranch: 'Search for branch...',
            openUntil: 'Open until',
            closed: 'Closed',
            minOrderLabel: 'Min. Order',
            deliveryFeeLabel: 'Delivery Fee',
            distanceLabel: 'Distance',
            selected: 'Selected',
            confirm: 'Confirm',
            sar: '',
            newFrenchCollection: 'New French Collection',
            darkChocolateSelection: 'Dark Chocolate Selection',
            premiumOrientalSweets: 'Premium Oriental Sweets',
            freeGiftWrapping: 'Free gift wrapping',
            returns24h: 'Returns within 24 hours',
            notAvailable: 'Not Available',
            notifyMe: 'Notify Me',
            notAvailableAt: 'Not available at',
            availableAt: 'Available at',
            thisBranch: 'this branch',
            loadingArrivals: 'Loading arrivals...',
            newArrivals: 'New Arrivals',
            discoverLatest: 'Discover our latest products',
            searchProducts: 'Search for products...',
            comingSoon: 'Coming Soon',
            productNotAvailable: 'Not Available',
            productUnavailableMessage: 'This product is not available at the moment',
            unavailable: 'Unavailable',
            preOrder: 'Pre-order',
            outOfStock: 'Out of Stock',
            feedbackTitle: 'Share Your Experience',
            feedbackSubtitle: 'We value your feedback to help us improve our quality.',
            rateProduct: 'Rate Product',
            rateBranch: 'Rate Branch Experience',
            yourComments: 'Your Comments',
            commentsPlaceholder: 'Tell us what you liked or how we can improve...',
            uploadImages: 'Upload Photos',
            uploadSubtitle: 'Show us your delicious moments!',
            submitFeedback: 'Submit Feedback',
            feedbackSuccess: 'Thank You!',
            feedbackSuccessMessage: 'Your feedback has been received. We appreciate your time!',
            backToHome: 'Back to Home',
            ratingRequired: 'Please provide a rating',
            commentRequired: 'Please share your thoughts',
            feedbackAnalytics: 'Feedback Analytics',
            exportData: 'Export Data',
            sentimentPositive: 'Positive',
            sentimentNeutral: 'Neutral',
            sentimentNegative: 'Negative',
            totalReviews: 'Total Reviews',
            averageRating: 'Average Rating',
            sentimentHealth: 'Sentiment Health',
            productReviewsTrends: 'Product Reviews Trends',
            branchPerformance: 'Branch Performance',
        },
        error: {
            pageNotFound: 'Page Not Found',
            notFoundMessage: 'Oops! It looks like this page has wandered off. Maybe it went to grab some chocolate!',
            backToHome: 'Back to Home',
            browseProducts: 'Browse Products',
            errorOccurred: 'Something went wrong',
            errorMessage: 'We encountered an unexpected issue. Please try again.',
        },
        homepage: {
            shopByCategory: 'Shop by Category',
            discoverWideRange: 'Discover our wide range',
            bestSellers: 'Best Sellers',
            newArrivals: 'New Arrivals',
            offersAndDiscounts: 'Offers & Discounts',
            loyaltyProgram: 'Loyalty Program',
            shopByOccasion: 'Shop by Occasion',
            buildYourOwnCake: 'Build Your Own Cake',
            earnPointsWithEveryOrder: 'Earn points with every order',
            joinNowForFree: 'Join now for free',
        },

        categories: {
            chocolate: 'Chocolate',
            cakes: 'Cakes',
            biscuits: 'Biscuits',
            oriental: 'Oriental Sweets',
            coffee: 'Coffee',
            strawberry: 'Strawberry',
            gifts: 'Gifts',
            cupcakes: 'Cupcakes',
        }
    },
    ar: {
        common: {
            home: 'الرئيسية',
            products: 'المنتجات',
            back: 'رجوع',
            search: 'ابحث عن شوكولاته، كيك، هدايا...',
            cart: 'السلة',
            account: 'الحساب',
            favorites: 'المفضلة',
            points: 'نقطة',
            pointsVal: '٣٬٤٥٠ نقطة',
            subtotal: 'المجموع الفرعي',
            delivery: 'توصيل',
            pickup: 'استلام',
            selectBranch: 'اختر الفرع',
            olayaBranch: 'فرع العليا',
            addAddress: 'إضافة عنوان',
            save: 'حفظ',
            cancel: 'إلغاء',
            vatInclusive: 'شامل ضريبة القيمة المضافة',
            inStock: 'متوفر',
            reviews: 'مراجعة',
            quantity: 'الكمية',
            addToCart: 'أضف إلي السلة',
            buyNow: 'إشتري الان',
            freeDelivery: 'توصيل مجاني للطلبات فوق ٣٠٠',
            installments: 'قسّط مع تمارا وتابي',
            pointsEarn: 'اكسب نقاط مع كل طلب',
            since: 'منذ عام ١٩٧٩ — الطعم الأصيل',
            shopNow: 'تسوق الان',
            designYourCake: 'صمم كيكتك',
            discoverCollection: 'اكتشف تشكيلتنا الفاخرة من الشوكولاتة والكيك والحلويات الشرقية — مع خدمة توصيل سريعة وبرنامج ولاء يكافئك على كل طلب.',
            bestExperience: 'احصل على أفضل تجربة لمذاق',
            chocolateAndSweets: 'الشيكولاتة والحلويات',
            offers: 'العروض',
            occasions: 'المناسبات',
            shoppingCart: 'سلة المشتريات',
            discountCode: 'رمز الخصم',
            total: 'الإجمالي',
            subtotalNotice: 'الضرائب مشمولة. يتم حساب رسوم الشحن عند إتمام الشراء.',
            viewCart: 'عرض السلة',
            checkout: 'إتمام الطلب',
            emptyCart: 'سلة التسوق فارغة',
            emptyCartNotice: 'لا يزال هناك الكثير من المنتجات الرائعة التي يمكنك إضافتها.',
            continueShopping: 'مواصلة التسوق',
            spendMore: 'أنفق',
            moreForFreeShipping: 'إضافية للحصول على شحن مجاني!',
            limitedQuantity: 'كمية محدودة — الدفع خلال',
            deliverToAddress: 'التوصيل لهذا العنوان',
            storePickup: 'استلام من الفرع',
            searchBranch: 'ابحث عن فرع...',
            openUntil: 'مفتوح حتى',
            closed: 'مغلق',
            minOrderLabel: 'الحد الأدنى للطلب',
            deliveryFeeLabel: 'رسوم التوصيل',
            distanceLabel: 'المسافة',
            selected: 'مختار',
            confirm: 'تأكيد',
            sar: '',
            newFrenchCollection: 'المجموعة الفرنسية الجديدة',
            darkChocolateSelection: 'تشكيلة الشوكولاتة الداكنة',
            premiumOrientalSweets: 'حلويات شرقية فاخرة',
            freeGiftWrapping: 'تغليف هدايا مجاني',
            returns24h: 'استرجاع خلال ٢٤ ساعة',
            notAvailable: 'غير متوفر',
            notifyMe: 'أبلغني عن التوفر',
            notAvailableAt: 'غير متوفر في',
            availableAt: 'متوفر في',
            thisBranch: 'هذا الفرع',
            loadingArrivals: 'جاري تحميل المنتجات...',
            newArrivals: 'وصلت حديثاً',
            discoverLatest: 'شاهد أحدث المنتجات لدينا',
            searchProducts: 'ابحث عن المنتجات...',
            comingSoon: 'قريباً',
            productNotAvailable: 'غير متاح',
            productUnavailableMessage: 'هذا المنتج غير متاح حالياً',
            unavailable: 'غير متاح',
            preOrder: 'طلب مسبق',
            outOfStock: 'نفذت الكمية',
            feedbackTitle: 'شاركنا تجربتك',
            feedbackSubtitle: 'رأيك يهمنا لنتمكن من تقديم الأفضل دائماً.',
            rateProduct: 'تقييم المنتج',
            rateBranch: 'تقييم تجربة الفرع',
            yourComments: 'ملاحظاتك',
            commentsPlaceholder: 'أخبرنا عن رأيك أو كيف يمكننا التحسن...',
            uploadImages: 'إضافة صور',
            uploadSubtitle: 'شاركنا لحظاتك السعيدة!',
            submitFeedback: 'إرسال التقييم',
            feedbackSuccess: 'شكراً لك!',
            feedbackSuccessMessage: 'تم استلام ملاحظاتك بنجاح. نقدر وقتك!',
            backToHome: 'العودة للرئيسية',
            ratingRequired: 'يرجى تحديد التقييم',
            commentRequired: 'يرجى كتابة تعليقك',
            feedbackAnalytics: 'تحليلات التقييمات',
            exportData: 'تصدير البيانات',
            sentimentPositive: 'إيجابي',
            sentimentNeutral: 'محايد',
            sentimentNegative: 'سلبي',
            totalReviews: 'إجمالي التقييمات',
            averageRating: 'متوسط التقييم',
            sentimentHealth: 'مؤشر المشاعر',
            productReviewsTrends: 'توجهات تقييمات المنتجات',
            branchPerformance: 'أداء الفروع',
        },
        error: {
            pageNotFound: 'الصفحة غير موجودة',
            notFoundMessage: 'عذراً! يبدو أن هذه الصفحة قد اختفت. ربما ذهبت لتحضر بعض الشوكولاتة!',
            backToHome: 'العودة للرئيسية',
            browseProducts: 'تصفح المنتجات',
            errorOccurred: 'حدث خطأ ما',
            errorMessage: 'واجهنا مشكلة غير متوقعة. يرجى المحاولة مرة أخرى.',
        },
        homepage: {
            shopByCategory: 'تسوق حسب التصنيف',
            discoverWideRange: 'إكتشف تشكيلاتنا الواسعه',
            bestSellers: 'الأكثر مبيعاً',
            newArrivals: 'أحدث المنتجات',
            offersAndDiscounts: 'العروض والخصومات',
            loyaltyProgram: 'برنامج الولاء',
            shopByOccasion: 'تسوق حسب المناسبة',
            buildYourOwnCake: 'اصنع كيكتك بنفسك',
            earnPointsWithEveryOrder: 'اكسب نقاطاً مع كل طلب',
            joinNowForFree: 'انضم الان مجاناً',
        },
        categories: {
            chocolate: 'الشوكولاته',
            cakes: 'الكيك',
            biscuits: 'البسكويت',
            oriental: 'الحلويات الشرقية',
            coffee: 'القهوة',
            strawberry: 'الفراوله',
            gifts: 'الهدايا',
            cupcakes: 'الكب كيك',
        }
    }
} as const;

export function useI18n(locale: string = 'ar') {
    const activeLocale = locale === 'en' ? 'en' : 'ar';
    return translations[activeLocale];
}
