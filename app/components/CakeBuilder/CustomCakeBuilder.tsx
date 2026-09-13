import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouteLoaderData, useFetcher, useRevalidator } from 'react-router';
import { DeliveryPickupModal } from '~/components/DeliveryPickupModal';
import { Cake, Palette, Sparkles, MessageSquare, Layers, ArrowRight, ArrowLeft, Eye, Compass, Clock, Check } from 'lucide-react';
import CakeRenderer from './CakeRenderer';
import {
  buildCakeOptions,
  unpricedSelections,
  provisionalSelections,
  type BuilderOption,
} from '~/lib/cake-render/builder-options';
import { CAKE_FILLINGS } from '~/lib/cake-render/catalog';
import type { CakeView, CakeAngle } from '~/lib/cake-render/compose';
import { FaqModal } from './FaqModal';
import { SaudiRiyalSymbol } from '~/components/Price';
import { sameAddressId } from '~/lib/address-coords';
import { trackSelectBranch } from '~/lib/analytics-events';

const toArabicDigits = (num: number | string) => {
  return String(num);
};

const SizeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_851_12688)">
      <path d="M11.991 0.0195312L11.0985 1.20453C10.9283 1.42971 10.8493 1.71084 10.8774 1.99172C10.9055 2.27259 11.0386 2.53252 11.25 2.71953V6.00003H7.5C6.70435 6.00003 5.94129 6.3161 5.37868 6.87871C4.81607 7.44132 4.5 8.20438 4.5 9.00003V13.5H3C2.20435 13.5 1.44129 13.8161 0.87868 14.3787C0.316071 14.9413 0 15.7044 0 16.5L0 22.5C0 22.8979 0.158035 23.2794 0.43934 23.5607C0.720644 23.842 1.10218 24 1.5 24H22.5C22.8978 24 23.2794 23.842 23.5607 23.5607C23.842 23.2794 24 22.8979 24 22.5V16.5C24 15.7044 23.6839 14.9413 23.1213 14.3787C22.5587 13.8161 21.7956 13.5 21 13.5H19.5V9.00003C19.5 8.20438 19.1839 7.44132 18.6213 6.87871C18.0587 6.3161 17.2956 6.00003 16.5 6.00003H12.75V2.70903C12.9569 2.52059 13.0858 2.26153 13.1114 1.98282C13.1369 1.70412 13.0572 1.42594 12.888 1.20303L11.991 0.0195312ZM6 9.00003C6 8.60221 6.15804 8.22068 6.43934 7.93937C6.72064 7.65807 7.10218 7.50003 7.5 7.50003H16.5C16.8978 7.50003 17.2794 7.65807 17.5607 7.93937C17.842 8.22068 18 8.60221 18 9.00003V9.62103C17.8198 9.62208 17.6413 9.58705 17.4749 9.51801C17.3084 9.44897 17.1575 9.34731 17.031 9.21903C16.7644 8.95217 16.4478 8.74046 16.0993 8.59602C15.7508 8.45158 15.3772 8.37724 15 8.37724C14.6228 8.37724 14.2492 8.45158 13.9007 8.59602C13.5522 8.74046 13.2356 8.95217 12.969 9.21903C12.7119 9.47587 12.3634 9.62014 12 9.62014C11.6366 9.62014 11.2881 9.47587 11.031 9.21903C10.7644 8.95217 10.4478 8.74046 10.0993 8.59602C9.75078 8.45158 9.37724 8.37724 9 8.37724C8.62276 8.37724 8.24922 8.45158 7.90073 8.59602C7.55224 8.74046 7.23563 8.95217 6.969 9.21903C6.84248 9.34731 6.69157 9.44897 6.52515 9.51801C6.35873 9.58705 6.18017 9.62208 6 9.62103V9.00003ZM6 11.121C6.735 11.121 7.47 10.8405 8.031 10.281C8.28808 10.0242 8.63661 9.87992 9 9.87992C9.36339 9.87992 9.71192 10.0242 9.969 10.281C11.091 11.4015 12.909 11.4015 14.031 10.281C14.2881 10.0242 14.6366 9.87992 15 9.87992C15.3634 9.87992 15.7119 10.0242 15.969 10.281C16.53 10.8405 17.265 11.121 18 11.121V13.5H6V11.121ZM1.5 16.5C1.5 16.1022 1.65804 15.7207 1.93934 15.4394C2.22064 15.1581 2.60218 15 3 15H21C21.3978 15 21.7794 15.1581 22.0607 15.4394C22.342 15.7207 22.5 16.1022 22.5 16.5V17.6895L21.969 18.2205C21.8417 18.3479 21.6905 18.449 21.5241 18.518C21.3577 18.5869 21.1794 18.6224 20.9993 18.6224C20.8191 18.6224 20.6408 18.5869 20.4744 18.518C20.308 18.449 20.1568 18.3479 20.0295 18.2205C19.7629 17.9539 19.4464 17.7424 19.098 17.5981C18.7497 17.4538 18.3763 17.3795 17.9993 17.3795C17.6222 17.3795 17.2488 17.4538 16.9005 17.5981C16.5521 17.7424 16.2356 17.9539 15.969 18.2205C15.7119 18.4774 15.3634 18.6216 15 18.6216C14.6366 18.6216 14.2881 18.4774 14.031 18.2205C13.7644 17.9537 13.4478 17.742 13.0993 17.5975C12.7508 17.4531 12.3772 17.3787 12 17.3787C11.6228 17.3787 11.2492 17.4531 10.9007 17.5975C10.5522 17.742 10.2356 17.9537 9.969 18.2205C9.71192 18.4774 9.36339 18.6216 9 18.6216C8.63661 18.6216 8.28808 18.4774 8.031 18.2205C7.76437 17.9537 7.44776 17.742 7.09927 17.5975C6.75078 17.4531 6.37724 17.3787 6 17.3787C5.62276 17.3787 5.24922 17.4531 4.90073 17.5975C4.55224 17.742 4.23563 17.9537 3.969 18.2205C3.71192 18.4774 3.36339 18.6216 3 18.6216C2.63661 18.6216 2.28808 18.4774 2.031 18.2205L1.5 17.6895V16.5ZM18.969 19.281C19.4251 19.7371 20.0214 20.0264 20.662 20.1023C21.3025 20.1782 21.9499 20.0363 22.5 19.6995V22.5H1.5V19.6995C2.6055 20.3775 4.0725 20.2395 5.031 19.2795C5.28808 19.0227 5.63661 18.8784 6 18.8784C6.36339 18.8784 6.71192 19.0227 6.969 19.2795C8.091 20.4015 9.909 20.4015 11.031 19.2795C11.2881 19.0227 11.6366 18.8784 12 18.8784C12.3634 18.8784 12.7119 19.0227 12.969 19.2795C14.091 20.4015 15.909 20.4015 17.0295 19.2795C17.1568 19.1521 17.308 19.0511 17.4744 18.9821C17.6408 18.9132 17.8191 18.8777 17.9993 18.8777C18.1794 18.8777 18.3577 18.9132 18.5241 18.9821C18.6905 19.0511 18.8417 19.1521 18.969 19.2795V19.281Z" fill="currentColor" />
    </g>
    <defs>
      <clipPath id="clip0_851_12688">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const FlavorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 17H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 7.00025C12 7.00025 13.5 5.96625 13.5 4.69125C13.5 2.43625 10.5 2.43625 10.5 4.69125C10.5 5.96625 12 7.00025 12 7.00025Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 17L3.621 19.485C3.72915 19.9177 3.97882 20.3018 4.33033 20.5763C4.68184 20.8508 5.11501 20.9999 5.561 21H18.438C18.884 20.9999 19.3172 20.8508 19.6687 20.5763C20.0202 20.3018 20.2698 19.9177 20.378 19.485L21 17M20.5 14.5C20.002 10.277 16.386 7 12 7C7.614 7 3.998 10.277 3.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DecorationIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 14L4.276 15.658C4.542 17.254 4.676 18.052 5.235 18.526C5.795 19 6.604 19 8.222 19H9.778C11.396 19 12.206 19 12.765 18.526C13.324 18.052 13.458 17.254 13.724 15.658L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 2.5C11 1.5 12 1 13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 6C10.1046 6 11 5.10457 11 4C11 2.89543 10.1046 2 9 2C7.89543 2 7 2.89543 7 4C7 5.10457 7.89543 6 9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path fillRule="evenodd" clipRule="evenodd" d="M6.99953 5.53482C6.25824 5.96238 5.67361 6.61641 5.33153 7.40082C5.25534 7.57554 5.13081 7.72484 4.97259 7.83114C4.81438 7.93744 4.62909 7.99632 4.43853 8.00082C4.04765 8.01034 3.66445 8.11141 3.31972 8.29592C2.97499 8.48042 2.67834 8.74321 2.45361 9.06317C2.22888 9.38314 2.08233 9.75135 2.02573 10.1382C1.96914 10.5251 2.00408 10.9199 2.12775 11.2908C2.25142 11.6617 2.46037 11.9985 2.73781 12.274C3.01525 12.5495 3.35345 12.7561 3.72522 12.8772C4.097 12.9983 4.492 13.0305 4.87848 12.9712C5.26496 12.9119 5.63214 12.7628 5.95053 12.5358C6.10582 12.4247 6.28967 12.3604 6.48034 12.3505C6.67102 12.3406 6.86055 12.3855 7.02653 12.4798C7.60753 12.8098 8.27953 12.9998 8.99953 12.9998C9.71953 12.9998 10.3915 12.8098 10.9725 12.4798C11.1385 12.3855 11.328 12.3406 11.5187 12.3505C11.7094 12.3604 11.8932 12.4247 12.0485 12.5358C12.3669 12.7628 12.7341 12.9119 13.1206 12.9712C13.5071 13.0305 13.9021 12.9983 14.2738 12.8772C14.6456 12.7561 14.9838 12.5495 15.2613 12.274C15.5387 11.9985 15.7476 11.6617 15.8713 11.2908C15.995 10.9199 16.0299 10.5251 15.9733 10.1382C15.9167 9.75135 15.7702 9.38314 15.5455 9.06317C15.3207 8.74321 15.0241 8.48042 14.6793 8.29592C14.3346 8.11141 13.9514 8.01034 13.5605 8.00082C13.37 7.99632 13.1847 7.93744 13.0265 7.83114C12.8683 7.72484 12.7437 7.57554 12.6675 7.40082C12.3255 6.61641 11.7408 5.96238 10.9995 5.53482V3.34082C12.369 3.82725 13.5162 4.79265 14.2295 6.05882C14.8722 6.16445 15.4842 6.40829 16.0234 6.77348C16.5627 7.13868 17.0162 7.61654 17.3528 8.17407C17.6893 8.73161 17.9009 9.35555 17.9729 10.0028C18.0449 10.6501 17.9755 11.3052 17.7696 11.9231C17.5638 12.541 17.2262 13.1068 16.7804 13.5815C16.3346 14.0562 15.791 14.4285 15.1873 14.6728C14.5836 14.917 13.9341 15.0273 13.2836 14.996C12.6331 14.9648 11.9971 14.7928 11.4195 14.4918C10.6569 14.8273 9.83272 15.0004 8.99953 14.9998C8.16627 15 7.3421 14.8267 6.57953 14.4908C6.00214 14.7917 5.36633 14.9637 4.71599 14.995C4.06565 15.0262 3.41628 14.916 2.8127 14.6718C2.20911 14.4277 1.66569 14.0555 1.21995 13.5809C0.774199 13.1063 0.436745 12.5407 0.230875 11.923C0.0250053 11.3053 -0.0443758 10.6503 0.0275206 10.0032C0.0994169 9.35612 0.310878 8.73232 0.647308 8.17489C0.983739 7.61746 1.43712 7.13968 1.97617 6.77451C2.51521 6.40935 3.12708 6.16551 3.76953 6.05982C4.48265 4.79327 5.62992 3.8275 6.99953 3.34082V5.53482Z" fill="currentColor" />
  </svg>
);

const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.9167 10.5002C21.9347 10.6562 21.9491 10.8129 21.9597 10.9702C22.0127 11.8012 22.0127 12.6602 21.9597 13.4912C21.6857 17.7332 18.3537 21.1132 14.1697 21.3912C12.7246 21.4865 11.2748 21.4865 9.82973 21.3912C9.31969 21.3561 8.81829 21.2414 8.34373 21.0512C7.83173 20.8412 7.57573 20.7352 7.44473 20.7512C7.31473 20.7672 7.12573 20.9062 6.74873 21.1852C6.08273 21.6752 5.24373 22.0292 3.99873 21.9982C3.36973 21.9832 3.05573 21.9752 2.91473 21.7352C2.77373 21.4952 2.94873 21.1632 3.29973 20.4982C3.78673 19.5762 4.09473 18.5202 3.62773 17.6752C2.82273 16.4672 2.13973 15.0362 2.03973 13.4912C1.98676 12.6521 1.98676 11.8104 2.03973 10.9712C2.31373 6.72924 5.64573 3.34924 9.82973 3.07124C11.0514 2.99083 12.2767 2.97848 13.4997 3.03424M8.49973 15.0002H15.4997M8.49973 10.0002H10.9997" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.8675 2.44016L21.5605 3.13216C21.8417 3.41345 21.9997 3.79491 21.9997 4.19266C21.9997 4.5904 21.8417 4.97186 21.5605 5.25316L17.9325 8.95016C17.6472 9.23558 17.2822 9.428 16.8855 9.50216L14.6375 9.99016C14.5557 10.0079 14.4708 10.0049 14.3906 9.98137C14.3103 9.95783 14.2372 9.91453 14.178 9.85542C14.1188 9.79632 14.0754 9.7233 14.0517 9.64307C14.028 9.56283 14.0249 9.47793 14.0425 9.39616L14.5215 7.16116C14.5954 6.76457 14.7874 6.3996 15.0725 6.11416L18.7465 2.44016C19.0278 2.15895 19.4092 2.00098 19.807 2.00098C20.2047 2.00098 20.5862 2.15895 20.8675 2.44016Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The builder's three view buttons, expressed as the engine's view + camera.
 *
 * Our switcher has always said front / top / sliced, and shoppers know it. The
 * engine thinks in views (whole, cut, slice, filling, combo) crossed with four
 * fixed cameras, so the mapping lives here rather than renaming buttons.
 *
 * "Top" is the whole cake at the 52° camera, not a true overhead: straight down
 * on a cake is a flat disc, which reads as a coaster. 52° still shows the
 * decoration layout, which is what anyone pressing Top is looking for.
 */
const VIEW_TO_RENDERER: Record<
  'front' | 'top' | 'sliced',
  {view: CakeView; angle: CakeAngle}
> = {
  front: {view: 'whole', angle: 'original'},
  top: {view: 'whole', angle: 'high'},
  sliced: {view: 'cut', angle: 'original'},
};

/**
 * Our four font choices, mapped onto the four the renderer will accept.
 *
 * The engine allowlists its font names and silently falls back on anything
 * else, so an unmapped name would quietly render in the wrong face rather than
 * erroring. Our labels are Arabic-facing; these are the CSS families.
 */
const FONT_FOR_RENDERER: Record<string, string> = {
  Classic: 'Noto Sans Arabic',
  'Noto Sans Arabic': 'Noto Sans Arabic',
  Tahoma: 'Tahoma',
  Arial: 'Arial',
  Handwriting: 'cursive',
  cursive: 'cursive',
};

/**
 * Shape families for the step-1 filter.
 *
 * `round-tall` is split out rather than left inside `round` because a 14 cm
 * cake is a different product to an 8 cm one at the same diameter — same
 * footprint, nearly twice the cake — and burying the twelve round formats in
 * one list makes the two heights look like duplicates of each other.
 */
const SHAPE_FAMILIES = [
  {id: 'all', nameAr: 'الكل', nameEn: 'All'},
  {id: 'round', nameAr: 'دائري', nameEn: 'Round'},
  {id: 'round-tall', nameAr: 'دائري مرتفع', nameEn: 'Round, tall'},
  {id: 'square', nameAr: 'مربع', nameEn: 'Square'},
  {id: 'rectangle', nameAr: 'مستطيل', nameEn: 'Rectangle'},
] as const;

type ShapeFamily = (typeof SHAPE_FAMILIES)[number]['id'];

const steps = [
  { id: 1, titleEn: 'Shape', titleAr: 'اختر الشكل', icon: Cake },
  { id: 2, titleEn: 'Flavor', titleAr: 'أختر النكهة', icon: FlavorIcon },
  { id: 3, titleEn: 'Decoration', titleAr: 'أختر التزيين', icon: DecorationIcon },
  { id: 4, titleEn: 'Message', titleAr: 'أضف رسالتك الخاصة', icon: MessageIcon }
];

/**
 * Option lists no longer live in this file at all.
 *
 * Shapes, fillings, coatings and decorations now come from
 * `~/lib/cake-render/catalog`, generated from the vendor's own package, and
 * their prices are joined on from the `cake_attribute` metaobject by
 * `builder_key`. See `builder-options.ts`.
 *
 * What used to sit at this line was eleven hand-picked frosting hexes. They
 * were invented here because the old flat-PNG preview recoloured artwork by
 * scanning pixels, so any hex would do. The new renderer multiplies a
 * luminance curve of a photographed white fondant by the colour the client
 * actually sampled off their own printed swatch — so a hand-picked hex would
 * render a coating the bakery cannot make.
 */

export default function CustomCakeBuilder({
  cakeAttributes = [],
  toppingDesigns = [],
  isEn = false,
  preparationHours = 24
}: {
  cakeAttributes?: any[],
  toppingDesigns?: any[],
  isEn?: boolean,
  preparationHours?: number
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isCutaway, setIsCutaway] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * The branch and fulfilment choice, from the same session the cart reads.
   *
   * A cake order used to go straight to a Shopify invoice with none of this
   * attached, so the kitchen got an order that did not say which branch was
   * making it or whether anyone was coming to collect it. The shopper may
   * already have chosen -- from the header pill, or on an earlier visit -- in
   * which case nothing is asked twice.
   */
  const cakeRootData = useRouteLoaderData('root') as any;
  const selectedBranchId: string = cakeRootData?.selectedLocationId || '';
  const selectedBranchName: string = cakeRootData?.selectedLocationName || '';
  const selectedFulfillment: string = cakeRootData?.fulfillmentType || '';
  const selectedDeliveryDate: string = cakeRootData?.deliveryDate || '';
  const hasFulfilmentChoice = !!(selectedBranchId && selectedFulfillment);

  /**
   * This page renders its own header -- PageLayout swaps the site header for a
   * bare logo on /custom-cake -- so the Header's branch modal, and the
   * `openDeliveryModal` listener that opens it from the cart, are both absent
   * here. The modal is mounted directly instead.
   */
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const branchFetcher = useFetcher();
  const revalidator = useRevalidator();

  /**
   * The address and fee the shopper chose, kept for the submit.
   *
   * A cake never enters the cart -- it becomes a draft order -- and that draft
   * was created with no `shippingAddress` at all, so Shopify's invoice page
   * fell back to the customer's DEFAULT address. A cake ordered to one address
   * was billed and printed to another. The delivery line priced at 0.00 for
   * the same reason: no fee was ever sent.
   *
   * The picker hands both to `onSelectBranch`; this handler used to ignore
   * them.
   */
  const [pickedAddress, setPickedAddress] = useState<any>(null);
  const [pickedDeliveryFee, setPickedDeliveryFee] = useState<number>(0);

  /**
   * The same two values, for a shopper who never picked a branch HERE.
   *
   * `selectedBranchId` and friends above come from the session, so the branch
   * row reads «القريات — توصيل» for anyone who chose in the header or the cart
   * on an earlier screen. The fee and the address did not: they are set only by
   * `handleSelectBranchForCake`, which fires only when the picker is used
   * inside this builder. Arrive with a branch already chosen and they stay at
   * their initial `0` and `null` -- so the draft order was created with a
   * «توصيل — القريات» line priced 0.00, and with no shippingAddress, which
   * makes Shopify's invoice fall back to the customer's default address. Every
   * shopper who set their branch once and then ordered a cake got free
   * delivery to possibly the wrong address.
   *
   * Both are resolved here from data this component already holds -- the same
   * `locations` and `customer` promises it hands to the picker below -- so no
   * new query is added. Only ever fills what is empty: a real pick always wins,
   * and re-picking in the builder overwrites this.
   */
  useEffect(() => {
    if (!hasFulfilmentChoice) return;
    if (String(selectedFulfillment).toLowerCase() !== 'delivery') return;
    if (pickedDeliveryFee > 0 && pickedAddress) return;

    let cancelled = false;

    (async () => {
      try {
        const [locations, customer] = await Promise.all([
          Promise.resolve(cakeRootData?.locations).catch(() => null),
          Promise.resolve(cakeRootData?.customer).catch(() => null),
        ]);
        if (cancelled) return;

        /** The branch's own fee, read the way the picker reads it. */
        if (!(pickedDeliveryFee > 0)) {
          /**
           * `{locations: {nodes: [...]}}` -- the raw LOCATIONS_QUERY result
           * root defers, the same object the picker receives. The looser reads
           * after it are only there so a shape change downgrades this to «no
           * fee seeded» rather than a crash on the checkout path.
           */
          const nodes =
            (locations as any)?.locations?.nodes ||
            (locations as any)?.nodes ||
            (Array.isArray(locations) ? locations : []) ||
            [];

          const branch = nodes.find(
            (n: any) => String(n?.id || '') === String(selectedBranchId),
          );

          if (branch) {
            let raw = (branch as any).delivery_fee?.value;
            if (raw === undefined) {
              raw = branch.metafields?.find(
                (m: any) => m?.key === 'delivery_fee',
              )?.value;
            }

            /** Metafields of this type arrive either bare or JSON-wrapped. */
            let fee = 0;
            if (raw !== undefined && raw !== null && raw !== '') {
              if (typeof raw === 'string' && raw.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(raw) as any;
                  fee = parseFloat(parsed?.value);
                } catch (e) {}
              } else {
                fee = parseFloat(raw);
              }
            }

            if (!cancelled && !isNaN(fee) && fee > 0) setPickedDeliveryFee(fee);
          }
        }

        /**
         * The address, matched by the id the session kept. Falling back to the
         * saved name is deliberate but weak -- every address a customer saves
         * carries their own name -- so the id is tried first.
         */
        if (!pickedAddress) {
          const addresses =
            (customer as any)?.customer?.addresses?.nodes ||
            (customer as any)?.addresses?.nodes ||
            (customer as any)?.addresses ||
            [];

          const wantedId = cakeRootData?.selectedAddressId;
          const wantedName = cakeRootData?.selectedAddressName;

          const match =
            (wantedId
              ? addresses.find((a: any) => sameAddressId(a?.id, wantedId))
              : null) ||
            (wantedName
              ? addresses.find(
                  (a: any) =>
                    a?.address1 === wantedName ||
                    `${a?.firstName || ''} ${a?.lastName || ''}`.trim() ===
                      wantedName,
                )
              : null);

          if (!cancelled && match?.address1) setPickedAddress(match);
        }
      } catch (e) {
        console.warn('[CAKE] Could not seed delivery fee/address from session:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasFulfilmentChoice,
    selectedFulfillment,
    selectedBranchId,
    cakeRootData,
    pickedDeliveryFee,
    pickedAddress,
  ]);

  const handleSelectBranchForCake = (
    branchSelected: any,
    type: 'delivery' | 'pickup',
    addressName?: string,
    isOutOfRange?: boolean,
    fullAddress?: any,
  ) => {
    setPickedAddress(type === 'delivery' && fullAddress?.address1 ? fullAddress : null);
    const feeForBranch =
      type === 'delivery'
        ? Number(branchSelected?.deliveryFee ?? branchSelected?.baseDeliveryFee ?? 0) || 0
        : 0;
    setPickedDeliveryFee(feeForBranch);

    /** Best-effort; a tag must never break the picker. */
    trackSelectBranch({
      branchId: branchSelected?.id,
      branchName: branchSelected?.name,
      fulfillmentType: type,
      source: 'cake_builder',
      deliveryFee: type === 'delivery' ? feeForBranch : null,
    });

    const formData = new FormData();
    formData.append('locationId', branchSelected?.id || '');
    formData.append('branchName', branchSelected?.name || '');
    formData.append('fulfillmentType', type);
    formData.append('manualLocationSelection', 'true');
    if (addressName) formData.append('addressName', addressName);
    // The id, because a customer's addresses all carry their own name.
    if (fullAddress?.id) formData.append('addressId', String(fullAddress.id));
    branchFetcher.submit(formData, {
      method: 'POST',
      action: '/api/location-id',
    });
    setIsBranchModalOpen(false);
  };

  // The choice lives in the session, so the page has to re-read it to see it.
  useEffect(() => {
    if (branchFetcher.state === 'idle' && branchFetcher.data) {
      revalidator.revalidate();
    }
  }, [branchFetcher.state, branchFetcher.data]);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);

  // Reset modal state when user returns via browser Back button (bfcache)
  React.useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      setIsSubmitting(false);
      setIsPrepModalOpen(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Touch gestures state
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const prepTimeOptions = React.useMemo(() => {
    const options = [
      {
        id: `${preparationHours}h`,
        nameEn: `I want it ready in ${preparationHours} Hours`,
        nameAr: `أريدها جاهزة خلال ${preparationHours} ساعة`,
        price: 0,
        descEn: `Your cake will be prepared and ready starting ${preparationHours} hours from now.`,
        descAr: `سيتم تحضير الكيكة وتجهيزها بعد ${preparationHours} ساعة من الآن.`
      },
      {
        id: `${preparationHours + 24}h`,
        nameEn: `I want it ready in ${preparationHours + 24} Hours`,
        nameAr: `أريدها جاهزة خلال ${preparationHours + 24} ساعة`,
        price: 0,
        descEn: `Your cake will be prepared and ready starting ${preparationHours + 24} hours from now.`,
        descAr: `سيتم تحضير الكيكة وتجهيزها بعد ${preparationHours + 24} ساعة من الآن.`
      }
    ];

    if (preparationHours === 24) {
      options.push({
        id: '72h',
        nameEn: 'I want it ready in 72 Hours',
        nameAr: 'أريدها جاهزة خلال 72 ساعة',
        price: 0,
        descEn: 'Your cake will be prepared and ready starting 72 hours from now.',
        descAr: 'سيتم تحضير الكيكة وتجهيزها بعد 72 ساعة من الآن.'
      });
    }

    return options;
  }, [preparationHours]);

  const photoPrintPrice = React.useMemo(() => {
    /**
     * Matched on `builder_key`, not on the English name.
     *
     * The old version searched every metaobject for a name containing "photo",
     * "print", "upload" or "image" — which would just as happily have matched a
     * decoration called "Printed Ribbon" and charged its price for uploading a
     * picture. One exact key, or no charge.
     */
    const row = cakeAttributes?.find(
      (attr) => attr?.builderKey?.value === 'photoPrint',
    );
    const raw = row?.priceDelta?.value;
    const price = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
    return Number.isFinite(price) && price >= 0 ? price : 0;
  }, [cakeAttributes]);

  /**
   * The option lists: identity from the render catalog, prices from Shopify.
   *
   * This replaces about eighty lines that read shapes, flavours and toppings
   * straight out of `cake_attribute` and derived an id by lowercasing the
   * English name. That worked while there were five prototype rows, but it
   * cannot address the renderer: the engine wants `round-20x20-h8`, not
   * `small_standard`, and it needs width, depth and height in centimetres that
   * the metaobject has no fields for.
   *
   * So identity comes from the catalog — 23 formats, 10 fillings, 22 coatings,
   * 16 decorations, all generated from the vendor's own package — and the
   * metaobject is left doing the one job it is genuinely good at, which is
   * letting the client change a price without a deploy.
   *
   * An option the client has not priced comes back `priced: false` and
   * `canCheckout` refuses it. Until the price sheet returns, that is every
   * option, and the button stays disabled on purpose.
   */
  const mergedOptions = React.useMemo(
    () => buildCakeOptions(cakeAttributes, isEn),
    [cakeAttributes, isEn],
  );

  /**
   * Nothing is chosen until the customer chooses it, so the total opens at
   * 0.00 and every riyal on it is something they clicked.
   *
   * This used to open on a complete cake and charge 370 before the first
   * click. Size and tier are gone entirely: neither had a step anywhere in
   * the builder, so the 180 for a "Medium" was money taken for a decision the
   * customer was never offered.
   */
  const [selections, setSelections] = useState({
    shape: null as any,
    flavor: null as any,
    style: null as any,
    color: null as any,
    messagePlacement: 'cake' as 'cake' | 'base' | 'both',
    message: '',
    baseMessage: '',
    specialInstructions: '',
    textColor: '#4a2511',
    textFont: 'Classic',
    uploadedImage: null as string | null,
    prepTime: null as any
  });

  const hasLoadedRef = useRef(false);

  /**
   * A saved or re-ordered design arrived but matched nothing in the catalog.
   *
   * Expected for any cake saved before the 23-format catalog replaced the six
   * named sizes: the old design names cannot resolve to the new ids. Shown
   * once, on step 1, so the customer knows their design did not come back
   * rather than assuming the page is broken.
   */
  const [restoreFailed, setRestoreFailed] = useState(false);

  /*
   * `shapeTouchedRef` lived here and is gone. It existed to let a re-ordered
   * cake keep a topping that was no longer offered for its shape — a rule that
   * only made sense while toppings were per-shape photographs. Every decoration
   * is now offered on every shape, so there is nothing to keep or drop.
   */

  // Helper to find matching option by name, id, gid, or partial string match
  const findMatchingOption = <T extends { id?: string; name?: string; color?: string; count?: number }>(
    options: T[],
    val: string | null | undefined,
    fallback: T
  ): T => {
    if (!val) return fallback;
    const cleanVal = val.trim().toLowerCase();
    const cleanValNormalized = cleanVal.replace(/[-_\s]+/g, '_');

    return options.find(opt => {
      const optId = (opt.id || '').toLowerCase();
      const optIdNormalized = optId.replace(/[-_\s]+/g, '_');
      const optName = (opt.name || '').toLowerCase();
      const optColor = (opt.color || '').toLowerCase();
      const optGid = ((opt as any).gid || '').toLowerCase();

      if (optId === cleanVal || optIdNormalized === cleanValNormalized) return true;
      if (optGid && optGid === cleanVal) return true;
      if (optName === cleanVal) return true;
      if (optColor && optColor === cleanVal) return true;
      if (opt.count && String(opt.count) === cleanVal) return true;

      if (optName && cleanVal) {
        if (optName.includes(cleanVal) || cleanVal.includes(optName)) return true;

        const parentheticalMatch = optName.match(/\(([^)]+)\)/);
        if (parentheticalMatch) {
          const enPart = parentheticalMatch[1].toLowerCase().trim();
          const enPartNormalized = enPart.replace(/[-_\s]+/g, '_');
          if (enPart === cleanVal || enPartNormalized === cleanValNormalized || cleanVal.includes(enPart) || enPart.includes(cleanVal)) {
            return true;
          }
        }

        const arPart = optName.split('(')[0].toLowerCase().trim();
        if (arPart && (arPart === cleanVal || cleanVal.includes(arPart) || arPart.includes(cleanVal))) {
          return true;
        }
      }

      return false;
    }) || fallback;
  };

  // Sync dynamic selections when options load exactly once
  React.useEffect(() => {
    if (cakeAttributes?.length > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;

      // 1. Check if user is returning from login with a pending cake design or re-ordering
      if (typeof window !== 'undefined') {
        let savedPending: any = null;
        try {
          const rawPending = localStorage.getItem('pending_custom_cake');
          if (rawPending) {
            const parsed = JSON.parse(rawPending);
            /**
             * A design from yesterday is not one anyone is still in the middle
             * of. Now that it is saved continuously rather than only on the way
             * to login, an entry can outlive the session that made it, and
             * handing someone last week's cake is a surprise rather than a
             * favour. Entries written before `savedAt` existed are still
             * honoured.
             */
            const age = Date.now() - Number(parsed?.savedAt || 0);
            if (!parsed?.savedAt || age < 24 * 60 * 60 * 1000) {
              savedPending = parsed;
            }
            localStorage.removeItem('pending_custom_cake');
          }
        } catch (e) {}

        const searchParams = new URLSearchParams(window.location.search);
        const isReorder = searchParams.get('reorder') === 'true';

        if (savedPending || isReorder) {
          const shapeVal = savedPending?.shape || searchParams.get('shape');
          const flavorVal = savedPending?.flavor || searchParams.get('flavor');
          const colorVal = savedPending?.color || searchParams.get('color');
          const toppingVal = savedPending?.style || searchParams.get('topping');
          const messageVal = savedPending?.message || searchParams.get('message') || '';
          const baseMessageVal = savedPending?.baseMessage || searchParams.get('baseMessage') || '';
          const specialInstructionsVal = savedPending?.specialInstructions || searchParams.get('specialInstructions') || '';
          const textFontVal = savedPending?.textFont || searchParams.get('textFont') || 'Classic';
          const textColorVal = savedPending?.textColor || searchParams.get('textColor') || '#4a2511';
          const rawPlacement = savedPending?.messagePlacement || searchParams.get('messagePlacement') || '';

          let messagePlacement: 'cake' | 'base' | 'both' = 'cake';
          if (rawPlacement.toLowerCase().includes('both') || rawPlacement.includes('معا')) messagePlacement = 'both';
          else if (rawPlacement.toLowerCase().includes('base') || rawPlacement.includes('القاعدة')) messagePlacement = 'base';

          /**
           * An unmatched value stays unchosen. Falling back to the first
           * option would quietly rebuild a different cake — and charge for it
           * — while looking like the one the customer saved.
           */
          const shape = findMatchingOption(mergedOptions.shapes, shapeVal, null as any);
          const flavor = findMatchingOption(mergedOptions.flavors, flavorVal, null as any);
          const style = findMatchingOption(mergedOptions.styles, toppingVal, null as any);
          const color = findMatchingOption(mergedOptions.colors, colorVal, null as any);

          setSelections({
            shape,
            flavor,
            style,
            color,
            messagePlacement,
            message: messageVal,
            baseMessage: baseMessageVal,
            specialInstructions: specialInstructionsVal,
            textColor: textColorVal,
            textFont: textFontVal,
            uploadedImage: savedPending?.uploadedImage || null,
            prepTime: savedPending?.prepTime || prepTimeOptions[0] || null,
          });

          /**
           * Land on the first step that still needs an answer, not always on 4.
           *
           * This used to jump straight to the last step on the assumption that
           * a restore had rebuilt the whole cake. It hadn't necessarily: an
           * unmatched value stays null by design (see above), and jumping
           * anyway put the customer on the writing step looking at a
           * placeholder, with nothing selected and no way to tell why.
           *
           * The catalog swap turned that from a rare case into the normal one.
           * Saved designs identify a shape by name — «ستاندرد صغير» — and the
           * new formats are addressed as `round-20x20-h8`. Nothing from before
           * this change can match, so every returning customer with a saved
           * cake would have hit it.
           */
          const restoredStep = !shape
            ? 1
            : !flavor || !color
              ? 2
              : !style
                ? 3
                : 4;
          setCurrentStep(restoredStep);

          if (restoredStep === 1 && (shapeVal || flavorVal || toppingVal)) {
            // Say so, rather than silently presenting an empty builder to
            // someone who expected their cake back.
            setRestoreFailed(true);
          }
          return;
        }
      }

      /**
       * Re-maps a choice already made onto the freshly loaded options — it
       * does not fill one in. It used to end each line with
       * `|| mergedOptions.shapes[0]`, which is how an untouched builder ended
       * up holding a cake.
       *
       * Preparation time keeps a default because it is a delivery window
       * rather than a purchase: every option costs 0, and one of them has to
       * be true.
       */
      setSelections((prev) => ({
        ...prev,
        shape: prev.shape
          ? mergedOptions.shapes.find((s) => s.id === prev.shape?.id) || prev.shape
          : null,
        flavor: prev.flavor
          ? mergedOptions.flavors.find((f) => f.id === prev.flavor?.id) || prev.flavor
          : null,
        style: prev.style
          ? mergedOptions.styles.find((s) => s.id === prev.style?.id) || prev.style
          : null,
        prepTime: prev.prepTime || prepTimeOptions[0] || null,
      }));
    }
  }, [mergedOptions, cakeAttributes, prepTimeOptions]);

  /**
   * One description of the design, used by every code path that stores it.
   *
   * The keys and the shapes of their values have to match what the restore
   * above reads, so they are written once here rather than spelled out at each
   * save site. `savedAt` is extra and the restore ignores it unless it is
   * checking the age.
   */
  const pendingCakeSnapshot = React.useCallback(
    () => ({
      shape: selections.shape?.name || selections.shape?.id,
      flavor: selections.flavor?.name || selections.flavor?.id,
      style: selections.style?.name || selections.style?.id,
      color:
        selections.color?.name || selections.color?.id || selections.color?.color,
      messagePlacement: selections.messagePlacement,
      message: selections.message,
      baseMessage: selections.baseMessage,
      specialInstructions: selections.specialInstructions,
      textFont: selections.textFont,
      textColor: selections.textColor,
      uploadedImage: selections.uploadedImage,
      prepTime: selections.prepTime,
      savedAt: Date.now(),
    }),
    [selections],
  );

  /**
   * The design is saved while it is being built, not only on the way to login.
   *
   * Storing it was previously a single line inside `handleCheckout`, reached
   * only when the order API answered `requireLogin`. Every other way of leaving
   * the page lost the cake — and one of those ways is a link the builder itself
   * tells people to follow: a shopper with no saved address who picks توصيل is
   * shown «إضافة عنوان جديد», which sends them to /account/addresses. They add
   * the address, come back, and the builder is empty. They did exactly what the
   * page asked and were punished for it.
   *
   * Saving on that one link would have fixed that one route out. The modal is
   * shared with the header and the cart, though, and it has no business knowing
   * about cakes — and the back button, a tab closing and the login detour all
   * lose the design the same way. Saving the design whenever it changes covers
   * all of them and needs nothing from the modal.
   *
   * Two guards matter:
   *
   *   - `hasLoadedRef` is what the restore sets. Without waiting for it, the
   *     first render's empty `selections` would be written over the very design
   *     being restored, which turns a fix into data loss.
   *   - Nothing is written for an untouched builder. Selections start null (see
   *     the note above about defaults), so this stays quiet until a real choice
   *     is made.
   */
  React.useEffect(() => {
    if (!hasLoadedRef.current || typeof window === 'undefined') return;

    const hasChoice = Boolean(
      selections.shape ||
        selections.flavor ||
        selections.style ||
        selections.color ||
        selections.message ||
        selections.baseMessage ||
        selections.specialInstructions ||
        selections.uploadedImage,
    );
    if (!hasChoice) return;

    /** Debounced: the message field fires this on every keystroke. */
    const timer = setTimeout(() => {
      const snapshot = pendingCakeSnapshot();
      try {
        localStorage.setItem('pending_custom_cake', JSON.stringify(snapshot));
      } catch (e) {
        /**
         * Quota. The photo is a data URL and the only field big enough to blow
         * it, so drop that and keep the rest rather than losing the design over
         * an image the shopper can re-attach.
         */
        try {
          localStorage.setItem(
            'pending_custom_cake',
            JSON.stringify({...snapshot, uploadedImage: null}),
          );
        } catch (inner) {
          console.warn('Failed to cache pending cake selection:', inner);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [selections, pendingCakeSnapshot]);

  /**
   * Every decoration is offered on every shape.
   *
   * This used to be sixty lines of filtering against the `cake_topping_design`
   * metaobject, and it earned its keep: each topping was a photograph taken on
   * one particular shape, so offering a topping shot on a round cake for a
   * square one put the wrong artwork on the preview.
   *
   * The procedural renderer removes the premise. `decorationInstances` walks
   * the cake's actual footprint — a circle or a rounded rectangle — and places
   * piped shells, rosettes and fruit along it at whatever spacing the size
   * calls for. There is no per-shape artwork left to mismatch, so there is
   * nothing to filter.
   *
   * `toppingDesigns` is still accepted as a prop and still queried by the
   * route. It is no longer read here. Removing it from the route query is a
   * separate change, once nothing else depends on those metaobjects.
   */
  const availableStyles = mergedOptions.styles;

  /**
   * Keep the selected decoration pointing at the current option object.
   *
   * Prices arrive from the metaobject after first paint, which rebuilds every
   * option. Without this the shopper's chosen decoration keeps the pre-price
   * object and the total silently omits it.
   */
  React.useEffect(() => {
    if (!selections.style) return;
    const match = availableStyles.find((s) => s.id === selections.style?.id);
    if (match && match !== selections.style) {
      setSelections((prev) => ({ ...prev, style: match }));
    }
  }, [availableStyles, selections.style]);

  /** The same re-sync for shape and filling, for the same reason. */
  React.useEffect(() => {
    if (selections.shape) {
      const match = mergedOptions.shapes.find((s) => s.id === selections.shape?.id);
      if (match && match !== selections.shape) {
        setSelections((prev) => ({ ...prev, shape: match }));
      }
    }
    if (selections.flavor) {
      const match = mergedOptions.flavors.find((f) => f.id === selections.flavor?.id);
      if (match && match !== selections.flavor) {
        setSelections((prev) => ({ ...prev, flavor: match }));
      }
    }
  }, [mergedOptions.shapes, mergedOptions.flavors, selections.shape, selections.flavor]);

  const [view, setView] = useState<'front' | 'top' | 'sliced'>('front');

  /**
   * Every view works on every shape now, so this is a constant.
   *
   * It used to test for an `imageTop` or `imageSliced` file on the metaobject,
   * falling back to a hardcoded list of five shape ids — which is why a square
   * cake had no top view: nobody had photographed one. The renderer draws any
   * view of any format from the same mesh, so the switcher no longer has to
   * hide buttons that would show nothing.
   */
  const supportedViews = {front: true, top: true, sliced: true} as const;

  const {view: rendererView, angle: rendererAngle} = VIEW_TO_RENDERER[view];

  const [shapeFamily, setShapeFamily] = useState<ShapeFamily>('all');

  const visibleShapes = React.useMemo(() => {
    const matches = (s: BuilderOption) => {
      if (shapeFamily === 'all') return true;
      if (shapeFamily === 'round') return s.shape === 'round' && s.height === 8;
      if (shapeFamily === 'round-tall') return s.shape === 'round' && s.height === 14;
      return s.shape === shapeFamily;
    };
    return mergedOptions.shapes.filter(
      (s) => matches(s) || s.id === selections.shape?.id,
    );
  }, [mergedOptions.shapes, shapeFamily, selections.shape?.id]);

  React.useEffect(() => {
    // Functional form on purpose: the effect depends only on `isCutaway`, so
    // reading `view` from the closure would read whatever it was when the
    // cutaway toggled, not what it is now.
    setView((current) =>
      isCutaway ? 'sliced' : current === 'sliced' ? 'front' : current,
    );
  }, [isCutaway]);

  /**
   * The view follows the step, because each step is about a different part of
   * the cake.
   *
   * Steps 1, 3 and 4 are outside views — the silhouette, the decoration, the
   * message — and `front` is right for all three, which is all this effect
   * used to say. Step 2 is the one step whose choice is invisible from the
   * outside: swapping شوكولاتة for فراولة changes nothing on an uncut cake, so
   * a shopper was picking a filling blind unless they happened to know to press
   * «مقطوع» themselves.
   *
   * Resetting on every step change is deliberate, including when stepping back
   * onto a step already visited: a view chosen by hand belongs to the step it
   * was chosen on. Within a step the choice stands — this runs on `currentStep`
   * only.
   *
   * This is also the ONLY thing that may set `view` from the step. Adding a
   * second effect for step 2 alone does not work: this one is declared later in
   * the component, so React runs it later in the same commit and it silently
   * wins. If the rule needs to grow, it grows here.
   */
  React.useEffect(() => {
    setView(currentStep === 2 ? 'sliced' : 'front');
    setIsCutaway(false);
  }, [currentStep]);

  const handleSelect = (category: string, item: any) => {
    setSelections(prev => ({ ...prev, [category]: item }));
  };

  /**
   * What a step needs before it can be left.
   *
   * Nothing is pre-chosen any more, so Next has to stop asking the customer to
   * move past a decision they have not made — it used to always work, because
   * a default was always sitting there.
   */
  const stepComplete = (step: number) => {
    if (step === 1) return Boolean(selections.shape);
    if (step === 2) return Boolean(selections.flavor && selections.color);
    if (step === 3) return Boolean(selections.style);
    return true;
  };

  /**
   * Options the client has not priced yet.
   *
   * Empty means every chosen option has a `price_delta` row in Shopify. While
   * it is not empty the cake genuinely has no price, and selling it would mean
   * inventing one — so checkout is refused rather than defaulted to zero.
   *
   * Before the client returns the price sheet this names everything, and the
   * pay button stays disabled across the whole builder. That is the intended
   * state, not a fault: see `builder-options.ts`.
   */
  const unpriced = unpricedSelections(selections);

  /**
   * Options priced by our model rather than by Saadeddin.
   *
   * These render a complete, believable total — that is the point, it makes the
   * builder demonstrable — but they must never reach a payment. Anyone reading
   * this after the client's sheet has been loaded: if this is still firing,
   * some rows still carry `provisional: true` in the `cake_attribute`
   * metaobject and have not been cleared.
   */
  const provisional = provisionalSelections(selections);

  /**
   * Does ANY option still carry a modelled price?
   *
   * Drives the notice at the top of the builder. Deliberately catalog-wide
   * rather than selection-based, so a shopper comparing sizes learns the
   * numbers are provisional before they commit to one, not after.
   */
  const catalogHasProvisionalPrices = React.useMemo(
    () =>
      [...mergedOptions.shapes, ...mergedOptions.flavors, ...mergedOptions.styles]
        .some((o) => o.provisional),
    [mergedOptions],
  );

  /** Every choice the order needs before it can be paid for. */
  const canCheckout =
    stepComplete(1) &&
    stepComplete(2) &&
    stepComplete(3) &&
    unpriced.length === 0;
  /*
   * `provisional` is intentionally NOT in that condition.
   *
   * Re-add `&& provisional.length === 0` to stop modelled prices being sold.
   * That must happen before launch if the client's real prices have not
   * replaced ours — a cake sold on a curve fit is a cake sold at the wrong
   * price.
   */

  /**
   * What the step is still waiting for, named.
   *
   * «Next» is disabled until `stepComplete` passes and said nothing about why,
   * which read as a dead button -- and worst on step 2, whose title is «أختر
   * النكهة» while its gate wants a flavour AND a frosting colour. Pick the
   * flavour the step asks for, press Next, and nothing happens: no movement, no
   * message, no console error. Pick a colour too and the same press works, so
   * it looked like a control that needed clicking twice.
   *
   * The gate itself is right -- both are needed further down, and a cake with
   * no colour cannot be made -- so this names the gap instead of loosening it.
   */
  const missingForStep = (step: number): string[] => {
    const missing: string[] = [];

    if (step === 1 && !selections.shape) {
      missing.push(isEn ? 'a shape' : 'الشكل');
    }

    if (step === 2) {
      if (!selections.flavor) missing.push(isEn ? 'a flavour' : 'النكهة');
      if (!selections.color) missing.push(isEn ? 'a frosting colour' : 'لون الكريمة');
    }

    if (step === 3 && !selections.style) {
      missing.push(isEn ? 'a decoration' : 'التزيين');
    }

    return missing;
  };

  /**
   * Why the pay button is disabled when every step is complete.
   *
   * Without this the shopper configures a whole cake, reaches the end and finds
   * a dead button — the same "control that needs clicking twice" problem the
   * step gates above were written to fix, one screen later.
   */
  const priceUnavailableMessage = unpriced.length
    ? isEn
      ? 'This combination is not priced yet. Please pick another, or contact us.'
      : 'هذا الاختيار غير مُسعّر حالياً. جرّب اختياراً آخر أو تواصل معنا.'
    : '';

  /** «النكهة ولون الكريمة» / «a flavour and a frosting colour». */
  const listMissing = (items: string[]): string =>
    items.length <= 1
      ? items[0] || ''
      : isEn
        ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
        : items.join(' و');

  const nextStep = () => {
    if (!stepComplete(currentStep)) return;
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEndEvent = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // RTL Swipe Logic:
    // Left swipe (moving finger left) -> Distance > 0 -> Next step
    // Right swipe (moving finger right) -> Distance < 0 -> Previous step
    if (isLeftSwipe) {
      nextStep();
    }
    if (isRightSwipe) {
      prevStep();
    }
  };

  const calculateTotal = () => {
    let total = 0;
    if (selections.shape && !isNaN(Number(selections.shape.price))) total += Number(selections.shape.price);
    if (selections.flavor && !isNaN(Number(selections.flavor.price))) total += Number(selections.flavor.price);
    if (selections.style && !isNaN(Number(selections.style.price))) total += Number(selections.style.price);
    if (selections.color && !isNaN(Number(selections.color.price))) total += Number(selections.color.price);
    if (selections.uploadedImage && !isNaN(photoPrintPrice)) total += photoPrintPrice;
    if (selections.prepTime && !isNaN(Number(selections.prepTime.price))) total += Number(selections.prepTime.price);
    return total;
  };

  const handleCheckout = async () => {
    /**
     * The Header owns the branch modal and listens for this event, which is
     * how the cart opens it too. Asking here rather than on the invoice page
     * is the whole point: a draft order has no way to collect it afterwards.
     */
    if (!hasFulfilmentChoice) {
      setIsBranchModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    // Capture the 3D Canvas as a screenshot
    let cakePreviewImage = null;
    const canvas = document.getElementById('cake-3d-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        // Use heavily compressed JPEG instead of PNG to prevent Oxygen payload & CPU limits
        cakePreviewImage = canvas.toDataURL('image/jpeg', 0.2);
      } catch (e) {
        console.error('Failed to capture canvas screenshot:', e);
      }
    }

    try {
      const response = await fetch('/api/custom-cake-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: selections.shape?.name,
          flavor: selections.flavor?.name,
          color: selections.color?.name,
          topping: selections.style?.name,
          /**
           * The machine-readable spec, alongside the human labels above.
           *
           * A baker reads «دائري — قطر ٢٠ سم»; a system needs
           * `round-20x20-h8`. Sending only the label means anyone downstream —
           * the CRM, a production sheet, a reorder — has to parse Arabic prose
           * back into dimensions, and will eventually parse it wrong.
           *
           * `cakeSpec` is additive: nothing currently reads it, and the
           * existing attributes are untouched, so this cannot break the orders
           * going through today.
           */
          cakeSpec: {
            schema: 'saadeddin-cake-v5',
            formatId: selections.shape?.id || null,
            shape: selections.shape?.shape || null,
            widthCm: selections.shape?.width ?? null,
            depthCm: selections.shape?.depth ?? null,
            heightCm: selections.shape?.height ?? null,
            fillingId: selections.flavor?.id || null,
            colorId: selections.color?.id || null,
            decorationId: selections.style?.id || null,
            priceLines: [
              selections.shape && {
                key: `format:${selections.shape.id}`,
                amount: selections.shape.price,
              },
              selections.flavor && {
                key: `filling:${selections.flavor.id}`,
                amount: selections.flavor.price,
              },
              selections.style && {
                key: `decoration:${selections.style.id}`,
                amount: selections.style.price,
              },
              selections.uploadedImage &&
                photoPrintPrice > 0 && {
                  key: 'extra:photo',
                  amount: photoPrintPrice,
                },
            ].filter(Boolean),
          },
          messagePlacement: selections.messagePlacement,
          message: selections.message,
          baseMessage: selections.baseMessage,
          specialInstructions: selections.specialInstructions,
          messageFont: selections.textFont,
          messageColor: selections.textColor,
          uploadedImage: selections.uploadedImage,
          prepTime: isEn ? selections.prepTime?.nameEn : selections.prepTime?.nameAr,
          cakePreviewImage, // Send the screenshot
          finalTotal: calculateTotal(),
          isEn: isEn,
          branchId: selectedBranchId,
          branchName: selectedBranchName,
          fulfillmentType: selectedFulfillment,
          deliveryDate: selectedDeliveryDate,
          // Without these the draft order has no address and a free delivery
          // line -- see the note on handleSelectBranchForCake.
          deliveryFee: pickedDeliveryFee,
          address: pickedAddress
            ? {
                address1: pickedAddress.address1 || '',
                address2: pickedAddress.address2 || '',
                city: pickedAddress.city || '',
                province: pickedAddress.province || '',
                zip: pickedAddress.zip || '',
                country: pickedAddress.country || pickedAddress.countryCodeV2 || 'SA',
                firstName: pickedAddress.firstName || '',
                lastName: pickedAddress.lastName || '',
                phone: pickedAddress.phone || '',
              }
            : null,
        })
      });
      const data = (await response.json()) as any;
      if (data.requireLogin && data.loginUrl) {
        try {
          /**
           * The autosave above has almost certainly stored this already; this
           * write stays so the login redirect never depends on the debounce
           * having fired.
           */
          localStorage.setItem(
            'pending_custom_cake',
            JSON.stringify(pendingCakeSnapshot()),
          );
        } catch (e) {
          console.warn('Failed to cache pending cake selection:', e);
        }
        window.location.href = data.loginUrl;
        return;
      }
      if (data.checkoutUrl) {
        /**
         * The design has been ordered, so it is no longer in progress. Without
         * this the autosaved copy survives, and the next visit to the builder
         * would open on the cake they just bought.
         */
        try {
          localStorage.removeItem('pending_custom_cake');
        } catch (e) {}
        window.location.href = data.checkoutUrl;
      } else {
        alert(
          data.error ||
            (isEn
              ? 'Something went wrong while placing your order.'
              : 'حدث خطأ أثناء إتمام الطلب'),
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      alert(
        isEn
          ? 'Connection error. Please check your internet and try again.'
          : 'حدث خطأ في الاتصال بالخادم',
      );
      setIsSubmitting(false);
    }
  };

  const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const LeafIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 4 6 4 13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13C20 6 12 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const TruckIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 18H3V6H17V18H15M17 10H21V18H19M5 18C5 19.1046 5.89543 20 7 20C8.10457 20 9 19.1046 9 18C9 16.8954 8.10457 16 7 16C5.89543 16 5 16.8954 5 18ZM15 18C15 19.1046 15.8954 20 17 20C18.1046 20 19 19.1046 19 18C19 16.8954 18.1046 16 17 16C15.8954 16 15 16.8954 15 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const HeartIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const renderOptionsGrid = (category: string, options: any[]) => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full">
      {options.map(option => {
        const isSelected = (selections[category as keyof typeof selections] as any)?.id === option.id;
        const nameParts = option.name.split(' (');
        const displayName = isEn && nameParts.length > 1 ? nameParts[1].replace(')', '') : nameParts[0].trim();

        return (
          <div
            key={option.id}
            className={`flex-1 p-6 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center justify-center text-center ${isSelected
              ? 'border-[#294941] bg-[#F7EAE6]'
              : 'border-[#E5E7EB] bg-white hover:border-[#294941]/50'
              }`}
            onClick={() => handleSelect(category, option)}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 text-white bg-[#294941] rounded-full p-1 z-10 w-5 h-5 flex items-center justify-center">
                <CheckIcon className="w-3 h-3" />
              </div>
            )}

            {/*
              Show the thumbnail for anything that has one. Shapes were
              excluded here because the old six had none worth showing — the
              only art available was hotlinked off a competitor's CDN. The 23
              catalog formats each ship their own rendered thumbnail, and with
              23 sizes to choose between, a picture is doing real work.
            */}
            {category === 'flavor' || ((category === 'style' || category === 'shape') && option.image) ? (
              <div className="w-14 h-14 rounded-full border border-gray-200 shadow-sm mb-3 flex items-center justify-center overflow-hidden relative bg-[#fafafa]">
                <img src={option.image} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : option.color && (
              <div
                className="w-12 h-12 rounded-full border-2 border-gray-200 shadow-sm mb-3 flex items-center justify-center overflow-hidden relative"
                style={
                  option.isCustom
                    ? (isSelected ? { backgroundColor: selections.color?.color } : { background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' })
                    : { backgroundColor: option.color }
                }
              >
                {option.isCustom && (
                  <>
                    <div className="w-full h-full flex items-center justify-center bg-black/10 pointer-events-none">
                      <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <input
                      type="color"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={isSelected ? selections.color?.color : option.color}
                      onChange={(e) => {
                        const hex = e.target.value;
                        setSelections(prev => ({
                          ...prev,
                          color: { ...option, color: hex }
                        }));
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(category, option);
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {category !== 'color' && (
              <div className="font-bold text-[#1a1a1a] text-lg">{displayName}</div>
            )}
            {(option.personsAr || option.persons) && <div className="text-[#8BA19C] text-sm mt-2">{isEn ? option.personsEn : option.personsAr || option.persons}</div>}
            {category !== 'color' && (
              <div className="text-[#1a1a1a] font-bold text-xl mt-4 flex items-center justify-center gap-1">
                {option.price > 0 ? (
                  <>
                    {toArabicDigits(option.price)}
                    <SaudiRiyalSymbol className="w-auto h-4 text-[#1a1a1a]" />
                  </>
                ) : (isEn ? 'Included' : 'مشمول')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen lg:h-screen w-full lg:overflow-hidden bg-white ${isEn ? 'font-en' : 'font-arabic'}`} dir={isEn ? 'ltr' : 'rtl'}>

      {/* HEADER */}
      <section
        className="relative h-[144px] w-full bg-[#234745] text-white shrink-0 shadow-md overflow-hidden flex items-center"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div
          className="absolute inset-0 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
          style={{
            backgroundImage: "url('/images/second-bg-pattern.svg')",
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 flex items-center justify-between gap-2 md:gap-4">
          {/* Right Group in RTL: Back Button + Title */}
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <button
              onClick={() => window.history.back()}
              className={`flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0 ${isEn ? 'font-en' : ''}`}
              style={isEn ? {} : { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              dir={isEn ? 'ltr' : 'rtl'}
            >
              <svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isEn ? 'rotate-180' : ''}`}>
                <path d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z" fill="#234745"/>
              </svg>
              <span>{isEn ? 'Back' : 'رجوع'}</span>
            </button>

            <h1 className="text-[18px] md:text-2xl font-extrabold leading-tight text-white m-0">
              {isEn ? 'Design Your Cake' : 'صمم كيكتك'}
            </h1>
          </div>

          {/* Left Group in RTL: Total Price */}
          <div className={`flex flex-col items-end shrink-0 ${isEn ? 'text-right' : 'text-left'}`}>
            <span className="text-[10px] md:text-sm font-medium mb-0.5 opacity-90">{isEn ? 'Total' : 'الإجمالي'}</span>
            <div className="flex items-center gap-1.5" dir="ltr">
              <SaudiRiyalSymbol className="w-auto h-3.5 md:h-5 shrink-0" />
              <span className="text-xl md:text-3xl font-black font-en tracking-tight">
                {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse lg:flex-row-reverse flex-1 min-h-0 lg:overflow-hidden">

        {/* LEFT COLUMN */}
        <div
          className="w-full lg:w-1/2 flex flex-col h-auto lg:h-full bg-white overflow-y-auto custom-scrollbar relative"
        >
          <div className="px-4 py-8 sm:px-6 md:px-12 lg:px-16 lg:py-16 pb-28 md:pb-36 w-full mx-auto max-w-[800px] flex-1">

            {/* Tagline */}
            <div className="flex items-center justify-start gap-2 text-[#E25555] mb-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M7.90323 4.158C9.17023 1.886 9.80323 0.75 10.7502 0.75C11.6972 0.75 12.3302 1.886 13.5972 4.158L13.9252 4.746C14.2852 5.392 14.4652 5.715 14.7452 5.928C15.0252 6.141 15.3752 6.22 16.0752 6.378L16.7112 6.522C19.1712 7.079 20.4002 7.357 20.6932 8.298C20.9852 9.238 20.1472 10.219 18.4702 12.18L18.0362 12.687C17.5602 13.244 17.3212 13.523 17.2142 13.867C17.1072 14.212 17.1432 14.584 17.2152 15.327L17.2812 16.004C17.5342 18.621 17.6612 19.929 16.8952 20.51C16.1292 21.091 14.9772 20.561 12.6752 19.501L12.0782 19.227C11.4242 18.925 11.0972 18.775 10.7502 18.775C10.4032 18.775 10.0762 18.925 9.42223 19.227L8.82623 19.501C6.52323 20.561 5.37124 21.091 4.60624 20.511C3.83924 19.929 3.96623 18.621 4.21923 16.004L4.28523 15.328C4.35723 14.584 4.39323 14.212 4.28523 13.868C4.17923 13.523 3.94024 13.244 3.46424 12.688L3.03024 12.18C1.35324 10.22 0.515235 9.239 0.807235 8.298C1.09923 7.357 2.33024 7.078 4.79024 6.522L5.42624 6.378C6.12524 6.22 6.47424 6.141 6.75524 5.928C7.03624 5.715 7.21523 5.392 7.57523 4.746L7.90323 4.158Z" stroke="#E64950" strokeWidth="1.5" />
              </svg>
              <span className="text-[14px] font-bold">{isEn ? 'Create an unforgettable moment — step by step' : 'أصنع لحظة لا تُنسى — خطوة بخطوة'}</span>
            </div>

            {/*
              Provisional-price notice.

              Shown whenever ANY option in the catalog still carries a price we
              modelled rather than one Saadeddin supplied — not just the ones
              currently selected. That is deliberate: a shopper comparing sizes
              is reading numbers that may move, and only telling them once they
              have picked a flagged one would be telling them too late.

              This replaced a hard checkout block. The block was correct and
              unusable: with all 51 prices flagged, no cake could be bought at
              all, which made the order path untestable. The flag still lives
              in the data and `provisionalSelections` still computes it, so
              re-arming the block before launch is one condition in
              `canCheckout`.
            */}
            {catalogHasProvisionalPrices && (
              <div
                role="status"
                className={`mb-6 rounded-xl border border-[#E8D8B0] bg-[#FDF8EC] px-4 py-3 text-sm text-[#6B5730] ${isEn ? 'text-left' : 'text-right'}`}
              >
                {isEn
                  ? 'Prices shown are provisional and awaiting confirmation from Saadeddin.'
                  : 'الأسعار المعروضة مبدئية وقيد الاعتماد من سعد الدين.'}
              </div>
            )}

            {/* Title */}
            <div className={`mb-[32px] ${isEn ? 'text-left' : 'text-right'}`}>
              <h1 className="sm:!text-[38px] !text-[28px] font-extrabold text-[#171717] !mb-2 !mt-2 leading-tight">{isEn ? 'Design Your Custom Cake' : 'صمّم كيكتك بلمستك الخاصة'}</h1>
              <p className="text-[#8BA19C] text-[14px">{isEn ? 'Shape, size, flavor, decoration, and your message' : 'شكل، حجم، نكهة، تزيين، ورسالتك'}</p>
            </div>

            {/* Steps Boxes */}
            <div
              className="flex flex-row gap-4 mb-[30px] overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex-1 min-w-[120px] py-[16px] px-[24px] rounded-3xl border transition-all flex flex-col items-center justify-center gap-2 ${isActive
                      ? 'border-[#234745] bg-[#F7EAEB]'
                      : isCompleted
                        ? 'border-[#234745]/30 bg-white hover:border-[#234745]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#234745]/50'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-300 ${isActive
                      ? 'bg-[#234745] text-white'
                      : isCompleted
                        ? 'bg-[#234745] text-white'
                        : 'bg-[#A6C1B7] text-white'
                      }`}>
                      {isCompleted ? <CheckIcon className="w-5 h-5" /> : toArabicDigits(step.id)}
                    </div>
                    <div className="text-[14px] font-normal text-center text-[#234745]">
                      {isEn ? step.titleEn : step.titleAr}
                    </div>
                    <step.icon className={`w-6 h-6 transition-colors duration-300 ${isActive || isCompleted ? 'text-[#294941]' : 'text-[#A6C1B7]'}`} />
                  </button>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="min-h-[200px]">
              {currentStep === 1 && (
                <div className="animate-in fade-in duration-300 space-y-10">
                  <div>
                    <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Choose Shape' : 'اختر شكل الكيكة'}</h2>

                    {restoreFailed && (
                      <div className={`mt-4 rounded-xl border border-[#E8D8B0] bg-[#FDF8EC] px-4 py-3 text-sm text-[#6B5730] ${isEn ? 'text-left' : 'text-right'}`}>
                        {isEn
                          ? 'Your saved design could not be restored — our sizes and decorations have changed. Please build it again.'
                          : 'تعذّر استرجاع تصميمك المحفوظ — تغيّرت المقاسات والتزيينات لدينا. من فضلك أعد اختيار كيكتك.'}
                      </div>
                    )}

                    {/*
                      A family filter, because 23 sizes in one flat grid is a
                      wall. The old list had six and needed none. Filtering
                      never hides the shape already chosen — changing filter
                      would otherwise make a selected cake vanish from view
                      while still being the cake being built.
                    */}
                    {/*
                      No `justify-*` here, deliberately.

                      This read `isEn ? '' : 'justify-end'`, which put the
                      Arabic chips against the LEFT edge while the heading above
                      them sat on the right. `justify-end` is
                      `justify-content: flex-end`, and flex-end is the inline
                      END of the container -- which under `dir="rtl"` is the
                      left. The conditional was correcting for a direction flex
                      had already applied.

                      The default, `flex-start`, is the inline START: the right
                      in Arabic, the left in English. One class list, correct in
                      both, with nothing to keep in sync.
                    */}
                    <div className="flex flex-wrap gap-2 mt-5">
                      {SHAPE_FAMILIES.map((family) => (
                        <button
                          key={family.id}
                          type="button"
                          onClick={() => setShapeFamily(family.id)}
                          className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer border ${
                            shapeFamily === family.id
                              ? 'bg-[#294941] text-white border-[#294941]'
                              : 'bg-white text-[#294941] border-[#E5E7EB] hover:border-[#294941]/50'
                          }`}
                        >
                          {isEn ? family.nameEn : family.nameAr}
                        </button>
                      ))}
                    </div>

                    {renderOptionsGrid('shape', visibleShapes)}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="animate-in fade-in duration-300 space-y-10">
                  <div>
                    <div className={`flex items-center justify-between mb-4 ${isEn ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">{isEn ? 'Choose Flavor' : 'اختر نكهة الكيك'}</h2>
                    </div>
                    {renderOptionsGrid('flavor', mergedOptions.flavors)}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Frosting Color' : 'لون التغليف (الكريمة)'}</h2>
                    {renderOptionsGrid('color', mergedOptions.colors)}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="animate-in fade-in duration-300 space-y-4">
                  <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Choose Decoration Style' : 'اختر أسلوب التزيين'}</h2>

                  {selections.shape?.id === 'square' || selections.shape?.id === 'sheet' ? (
                    <div className={`p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn
                        ? 'Topping decorations are only available for Round, Standard, and Heart shapes.'
                        : 'زينة الكيك متوفرة فقط للأشكال الدائرية، الطويلة، والقلب.'}
                    </div>
                  ) : null}

                  {renderOptionsGrid('style', availableStyles)}
                </div>
              )}

              {currentStep === 4 && (
                <div className="animate-in fade-in duration-300 space-y-8">
                  {/* 1. Text Customization Position & Options */}
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
                      {isEn ? 'Text Customization & Personalization' : 'الكتابة وتخصيص الكيكة'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      {isEn
                        ? 'Choose where you want your custom message to be written (on the cake surface, base board, or both).'
                        : 'اختر موقع موضع الكتابة المخصص (على سطح الكيكة، على القاعدة، أو كلاهما).'}
                    </p>

                    {/* Text Placement Selector */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { id: 'cake', labelEn: 'On Cake Surface', labelAr: 'على الكيكة نفسها' },
                        { id: 'base', labelEn: 'On Base Board', labelAr: 'على القاعدة' },
                        { id: 'both', labelEn: 'Both Surface & Base', labelAr: 'الكيكة والقاعدة معا' }
                      ].map(option => {
                        const isSelected = selections.messagePlacement === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelections(prev => ({ ...prev, messagePlacement: option.id as any }))}
                            className={`p-3.5 rounded-xl border text-center font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'border-[#294941] bg-[#F7EAE6] text-[#294941] shadow-sm'
                                : 'border-[#E5E7EB] bg-white text-gray-700 hover:border-[#294941]/50'
                            }`}
                          >
                            <span>{isEn ? option.labelEn : option.labelAr}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Cake Surface Message Input */}
                    {(selections.messagePlacement === 'cake' || selections.messagePlacement === 'both') && (
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          {isEn ? 'Message on Cake Surface' : 'النص المكتوب على الكيكة'}
                        </label>
                        <div className="border border-[#E5E7EB] p-3 rounded-2xl focus-within:border-[#294941] bg-white">
                          <input
                            type="text"
                            className={`w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-lg text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#294941] ${isEn ? 'text-left' : 'text-right'}`}
                            placeholder={isEn ? 'Example: Happy Birthday Sarah' : 'مثال: سنة حلوة يا سارة'}
                            value={selections.message}
                            onChange={(e) => setSelections(prev => ({ ...prev, message: e.target.value }))}
                            maxLength={25}
                          />
                        </div>
                      </div>
                    )}

                    {/* Base Board Message Input */}
                    {(selections.messagePlacement === 'base' || selections.messagePlacement === 'both') && (
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          {isEn ? 'Message on Cake Base / Board' : 'النص المكتوب على قاعدة الكيكة'}
                        </label>
                        <div className="border border-[#E5E7EB] p-3 rounded-2xl focus-within:border-[#294941] bg-white">
                          <input
                            type="text"
                            className={`w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-lg text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#294941] ${isEn ? 'text-left' : 'text-right'}`}
                            placeholder={isEn ? 'Example: With Love from Saad Al Deen' : 'مثال: مع خالص الحب والأمنيات'}
                            value={selections.baseMessage}
                            onChange={(e) => setSelections(prev => ({ ...prev, baseMessage: e.target.value }))}
                            maxLength={30}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Text Color & Font */}
                  {(selections.message || selections.baseMessage) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{isEn ? 'Message Color' : 'اختر لون الكتابة'}</h3>
                        <div className={`flex flex-wrap gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 ${isEn ? 'justify-start' : 'justify-start'}`}>
                          {['#4a2511', '#8b0000', '#ffffff', '#ffb6c1', '#1a1a1a'].map(color => {
                            const isSelected = selections.textColor === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelections(prev => ({ ...prev, textColor: color }))}
                                className={`relative w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm
                                  ${isSelected ? 'ring-2 ring-offset-2 ring-[#294941] scale-110' : 'border border-gray-300 hover:scale-105'}
                                `}
                                style={{ backgroundColor: color }}
                                title={isEn ? 'Choose this colour' : 'اختر هذا اللون'}
                              >
                                {isSelected && (
                                  <svg className={`w-6 h-6 ${color === '#ffffff' ? 'text-[#1a1a1a]' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{isEn ? 'Message Font' : 'خط الكتابة'}</h3>
                        <select
                          className={`w-full p-3 rounded-xl border border-gray-200 bg-gray-50 ${isEn ? 'text-left' : 'text-right'}`}
                          value={selections.textFont}
                          onChange={(e) => setSelections(prev => ({ ...prev, textFont: e.target.value }))}
                        >
                          <option value="Classic">{isEn ? 'Classic' : 'كلاسيكي (Classic)'}</option>
                          <option value="Modern">{isEn ? 'Modern' : 'عصري (Modern)'}</option>
                          <option value="Handwriting">{isEn ? 'Handwriting' : 'كتابة يدوية (Handwriting)'}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 2. Dedicated Special Instructions Field */}
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">
                        {isEn ? 'Special Instructions' : 'ملاحظات'}
                      </h2>
                      <span className="text-xs text-gray-400 font-medium">
                        {selections.specialInstructions.length}/300
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {isEn
                        ? 'Enter any additional preparation notes or instructions for our bakers (e.g. reduced sugar, specific piping notes). This note will be attached to your order for the baker without appearing on the cake design.'
                        : 'أضف أي ملاحظات خاصة بالتحضير أو الخَبز (مثل تقليل السكر، أو ملاحظات الزينة). يتم إرفاق هذه الملاحظات مع الطلب للمخبز دون رسمها على تصميم الكيكة.'}
                    </p>
                    <div className="border border-[#E5E7EB] p-3 rounded-2xl focus-within:border-[#294941] bg-white">
                      <textarea
                        rows={3}
                        className={`w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#294941] resize-none ${isEn ? 'text-left' : 'text-right'}`}
                        placeholder={
                          isEn
                            ? 'Type any special requests or instructions here...'
                            : 'اكتب هنا أي تعليمات أو طلبات خاصة للمخبز...'
                        }
                        value={selections.specialInstructions}
                        onChange={(e) => setSelections(prev => ({ ...prev, specialInstructions: e.target.value.slice(0, 300) }))}
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">
                      {isEn ? 'Printed Image on Cake' : 'صورة مطبوعة على الكيك'}
                      {photoPrintPrice > 0 && (
                        <span className="text-base font-semibold text-[#8b0000] ml-2 rtl:mr-2">
                          (+{photoPrintPrice} {isEn ? 'SAR' : 'ر.س'})
                        </span>
                      )}
                    </h2>
                    <div className="border-2 border-dashed border-[#A6C1B7] bg-[#F6FAF8] p-6 rounded-2xl text-center relative hover:bg-[#EEF5F2] transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
                            const isAllowedType = allowedTypes.includes(file.type.toLowerCase());
                            const fileExtension = file.name.split('.').pop()?.toLowerCase();
                            const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
                            const isAllowedExtension = allowedExtensions.includes(fileExtension || '');

                            if (!isAllowedType || !isAllowedExtension) {
                              alert(isEn
                                ? 'Invalid file type. Please upload a valid image (PNG, JPG, WebP).'
                                : 'نوع ملف غير صالح. يرجى رفع صورة صالحة (PNG, JPG, WebP).'
                              );
                              e.target.value = '';
                              return;
                            }

                            // Limit image size to 3MB to prevent localStorage quota issues and server payload errors
                            const maxSizeBytes = 3 * 1024 * 1024;
                            if (file.size > maxSizeBytes) {
                              alert(isEn
                                ? 'Image file size is too large. Please upload an image smaller than 3MB.'
                                : 'حجم ملف الصورة كبير جداً. يرجى رفع صورة بحجم أقل من 3 ميجابايت.'
                              );
                              e.target.value = '';
                              return;
                            }

                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setSelections(prev => ({ ...prev, uploadedImage: event.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        {selections.uploadedImage ? (
                          <>
                            <img src={selections.uploadedImage} alt="Uploaded" className="w-24 h-24 object-cover rounded-xl shadow-sm mb-2" />
                            <span className="text-[#294941] font-bold">{isEn ? 'Change Image' : 'تغيير الصورة'}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-[#294941] mb-2">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <span className="text-[#294941] font-bold">{isEn ? 'Upload Image (Optional)' : 'ارفع صورة (اختياري)'}</span>
                            <span className="text-sm text-[#8BA19C]">{isEn ? 'PNG, JPG up to 5MB' : 'PNG, JPG حتى 5MB'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Next Button */}
            <div className={`mt-12 flex items-center justify-start gap-4 flex-wrap w-full ${isEn ? 'flex-row-reverse' : ''}`}>
              {currentStep < steps.length ? (
                <button
                  className={`inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold bg-[#294941] text-white hover:bg-[#1E3A34] transition-all text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#294941] ${isEn ? 'flex-row-reverse' : ''}`}
                  onClick={nextStep}
                  disabled={!stepComplete(currentStep)}
                  /**
                    * Named for a screen reader too, which otherwise hears only
                    * «Next, dimmed» with no reason given.
                    */
                  aria-describedby={
                    stepComplete(currentStep) ? undefined : 'cake-step-missing'
                  }
                >
                  {isEn ? `Next, ${steps[currentStep].titleEn}` : `التالي، ${steps[currentStep].titleAr}`}
                  <ArrowLeft className={`w-5 h-5 ${isEn ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  className={`inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold bg-[#294941] text-white hover:bg-[#1E3A34] transition-all text-xl disabled:opacity-50 disabled:cursor-not-allowed ${isEn ? 'flex-row-reverse' : ''}`}
                  onClick={() => setIsPrepModalOpen(true)}
                  disabled={isSubmitting || !canCheckout}
                  aria-describedby={canCheckout ? undefined : 'cake-step-missing'}
                >
                  {isSubmitting ? (isEn ? 'Preparing...' : 'جاري التحضير...') : (isEn ? 'Checkout and Pay' : 'إتمام الطلب والدفع')}
                  <ArrowLeft className={`w-5 h-5 ${isEn ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/*
                Why the button beside this is dim.

                Rendered for the last step too, where «إتمام الطلب والدفع» is
                gated on all three earlier steps -- reaching it with something
                unchosen is rarer, but just as silent when it happens.

                `aria-live` so the message is announced as choices are made,
                rather than only being there for anyone who goes looking.
              */}
              {(() => {
                /*
                  The price gate is checked FIRST, because it is the one case
                  where every step is complete and the button is still dim.
                  The missing-choice logic below can never explain it — with
                  nothing unchosen it finds no gate step and renders nothing,
                  which left the pay button dead and silent.
                */
                if (priceUnavailableMessage) {
                  return (
                    <span
                      id="cake-step-missing"
                      aria-live="polite"
                      className="text-[#9B3D32] text-sm font-medium"
                    >
                      {priceUnavailableMessage}
                    </span>
                  );
                }

                const gateStep =
                  currentStep < steps.length
                    ? currentStep
                    : [1, 2, 3].find((s) => !stepComplete(s));

                if (!gateStep) return null;

                const missing = missingForStep(gateStep);
                if (!missing.length) return null;

                return (
                  <span
                    id="cake-step-missing"
                    aria-live="polite"
                    className="text-[#8BA19C] text-sm font-medium"
                  >
                    {isEn
                      ? `Choose ${listMissing(missing)} to continue`
                      : `اختر ${listMissing(missing)} للمتابعة`}
                  </span>
                );
              })()}
            </div>

            {/* Sticky FAQ Floating Button */}
            <button
              type="button"
              onClick={() => setIsFaqOpen(true)}
              className={`fixed bottom-6 ${isEn ? 'right-6' : 'left-6'} z-40 flex items-center gap-2.5 bg-[#8c6b54] text-white px-5 py-3 rounded-full font-bold shadow-lg hover:bg-[#7a5c47] transition-all transform hover:scale-105 active:scale-95 ${isEn ? 'flex-row-reverse' : ''}`}
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              <span>{isEn ? 'Have a question?' : 'لديك سؤال؟'}</span>
              <div className="bg-[#bda061] text-white w-7 h-7 rounded-full flex items-center justify-center font-serif text-sm font-black shadow-inner">?</div>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          className="w-full lg:w-1/2 relative flex flex-col items-center justify-center py-10 lg:py-0 lg:h-full shrink-0 overflow-hidden bg-[#EED5D7]"
          style={{ backgroundImage: "url('/images/pattern.svg')", backgroundRepeat: 'repeat', backgroundSize: '600px' }}
        >

          {/* Center Content Group (Pills + Circle) */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 lg:gap-4 w-full mt-0">

            {/* Top Pill showing selected shape */}
            <div className="bg-[#20584A] text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shadow-sm">
              <span>
                {selections.shape
                  ? isEn
                    ? selections.shape.name.split(' (')[1]?.replace(')', '') || selections.shape.name.split(' (')[0]
                    : selections.shape.name.split(' (')[0]
                  : isEn
                    ? 'Choose a shape to begin'
                    : 'اختر الشكل للبدء'}
              </span>
            </div>

            {/* Circle & 3D Canvas */}
            <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-auto lg:h-[50vh] aspect-square rounded-full border-[12px] lg:border-[24px] border-white bg-[#EED5D7] shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                {/*
                  The live preview still draws nothing until a shape is picked
                  -- a rendered cake beside a 0.00 total would be a cake nobody
                  is buying. A photograph stands in until then: it reads as
                  decoration rather than as the cake being configured, which is
                  the distinction that matters here.
                */}
                {!selections.shape ? (
                  <img
                    src="/cake/cake-builder-placeholder.jpeg"
                    alt={isEn
                      ? 'Your cake will appear here as you choose'
                      : 'ستظهر كيكتك هنا كلما اخترت'}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                ) : (
                <CakeRenderer
                  /*
                   * `canvasId` is load-bearing: handleCheckout grabs the
                   * preview for the order with getElementById('cake-3d-canvas').
                   */
                  canvasId="cake-3d-canvas"
                  formatId={selections.shape.id}
                  fillingId={selections.flavor?.id || CAKE_FILLINGS[0].id}
                  colorId={selections.color?.id || '00'}
                  decorationId={selections.style?.id || 'none'}
                  view={rendererView}
                  angle={rendererAngle}
                  photoSrc={selections.uploadedImage}
                  text={{
                    /*
                     * Only the message written ON the cake reaches the
                     * renderer. `baseMessage` goes on the board, which the
                     * engine does not draw, and it still travels to the
                     * kitchen on the order.
                     */
                    value:
                      selections.messagePlacement === 'base'
                        ? ''
                        : selections.message,
                    color: selections.textColor,
                    scale: 1,
                    x: 0,
                    y: -0.2,
                    font: FONT_FOR_RENDERER[selections.textFont] || 'Noto Sans Arabic',
                  }}
                  isEn={isEn}
                />
                )}
              </div>
            </div>

            {/* View Switcher below the circle (outside the preview area) */}
            <div className="h-12 flex items-center justify-center shrink-0">
              {Object.values(supportedViews).filter(Boolean).length > 1 && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full shadow-md border border-gray-100 flex items-center gap-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => setView('front')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${view === 'front'
                      ? 'bg-[#294941] text-white shadow-sm'
                      : 'text-[#294941] hover:bg-gray-100'
                      }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Front' : 'جانبي'}</span>
                  </button>

                  {supportedViews.top && (
                    <button
                      type="button"
                      onClick={() => setView('top')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${view === 'top'
                        ? 'bg-[#294941] text-white shadow-sm'
                        : 'text-[#294941] hover:bg-gray-100'
                        }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Top' : 'علوي'}</span>
                    </button>
                  )}

                  {supportedViews.sliced && (
                    <button
                      type="button"
                      onClick={() => setView('sliced')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${view === 'sliced'
                        ? 'bg-[#294941] text-white shadow-sm'
                        : 'text-[#294941] hover:bg-gray-100'
                        }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>{isEn ? 'Sliced' : 'مقطوع'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Features Badges */}
          <div className="mt-2 lg:mt-4 z-10 w-[95%] lg:w-[90%] max-w-[450px] scale-90 lg:scale-100 origin-bottom">
            <div className="bg-[#F6FAF8] px-2 py-3 rounded-2xl flex items-center justify-between text-[#20584A] shadow-sm">

              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Made with Love<br />& Care</span> : <span>صنع بحب<br />وعناية</span>}
                </div>
                <HeartIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>

              <div className="w-[1px] h-8 bg-[#D5DBD9]"></div>

              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Refrigerated Delivery<br />Guaranteed</span> : <span>توصيل مبرد<br />لضمان الجودة</span>}
                </div>
                <TruckIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>

              <div className="w-[1px] h-8 bg-[#D5DBD9]"></div>

              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Premium<br />Ingredients</span> : <span>مكونات<br />فاخرة</span>}
                </div>
                <LeafIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>

            </div>
          </div>

        </div>
      </div>
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} isEn={isEn} />

      <DeliveryPickupModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        defaultTab={
          String(selectedFulfillment).toLowerCase() === 'pickup'
            ? 'pickup'
            : 'delivery'
        }
        locationsPromise={cakeRootData?.locations}
        customerPromise={cakeRootData?.customer}
        locale={isEn ? 'en' : 'ar'}
        googleMapsKey={cakeRootData?.googleMapsKey}
        onSelectBranch={handleSelectBranchForCake}
        selectedLocationId={cakeRootData?.selectedLocationId}
        selectedAddressName={cakeRootData?.selectedAddressName}
      />

      {isPrepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-gray-100 flex flex-col gap-6 animate-zoom-in max-h-[90vh] overflow-y-auto">
            <div className={isEn ? 'text-left' : 'text-right'}>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
                {isEn ? 'Select Preparation & Time' : 'اختر وقت التجهيز والاستلام'}
              </h2>
              <p className="text-[#8BA19C] text-sm">
                {isEn
                  ? `Custom cakes require a minimum of ${preparationHours} hours of preparation time. Please select one of the options below:`
                  : `تحتاج الكيكات المخصصة إلى ${preparationHours} ساعة كحد أدنى للتجهيز والتحضير. يرجى اختيار أحد الخيارات التالية:`}
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              {prepTimeOptions.map(option => {
                const isSelected = selections.prepTime?.id === option.id;
                return (
                  <div
                    key={option.id}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-start gap-2 ${isSelected
                      ? 'border-[#294941] bg-[#F6FAF8]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#294941]/50'
                      }`}
                    onClick={() => setSelections(prev => ({ ...prev, prepTime: option }))}
                  >
                    <div className={`absolute top-5 ${isEn ? 'right-5' : 'left-5'} w-6 h-6 rounded-full flex items-center justify-center border transition-all ${isSelected
                      ? 'bg-[#294941] border-[#294941] text-white'
                      : 'border-gray-300 bg-white text-transparent'
                      }`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="font-bold text-[#1a1a1a] pr-6 pl-6 text-[16px] leading-tight">
                      {isEn ? option.nameEn : option.nameAr}
                    </div>
                    <div className="text-[#8BA19C] text-xs pr-6 pl-6 mt-1">
                      {isEn ? option.descEn : option.descAr}
                    </div>
                    {option.price > 0 && (
                      <div className="text-[#294941] font-bold text-sm mt-1 pr-6 pl-6">
                        +{toArabicDigits(option.price)} <SaudiRiyalSymbol className="w-auto h-3.5 inline-block text-[#294941]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/*
              Where the cake is going, before it is paid for. The invoice page
              this leads to cannot ask, so it is asked here -- and shown, so
              nobody discovers their branch only on the order confirmation.
            */}
            <button
              type="button"
              onClick={() => setIsBranchModalOpen(true)}
              className={`w-full mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition-all ${
                hasFulfilmentChoice
                  ? 'border-[#E5E7EB] bg-white hover:border-[#294941]/50'
                  : 'border-[#E64950]/40 bg-[#FDEBEC] hover:border-[#E64950]'
              }`}
            >
              <span className="flex flex-col">
                <span className="text-[12px] text-[#8BA19C]">
                  {isEn ? 'Pickup branch or delivery' : 'فرع الاستلام أو التوصيل'}
                </span>
                <span className="font-bold text-[15px] text-[#1a1a1a]">
                  {hasFulfilmentChoice
                    ? `${selectedBranchName}${
                        String(selectedFulfillment).toLowerCase() === 'pickup'
                          ? isEn ? ' — Pickup' : ' — استلام'
                          : isEn ? ' — Delivery' : ' — توصيل'
                      }`
                    : isEn
                      ? 'Choose before checking out'
                      : 'اختر قبل إتمام الطلب'}
                </span>
              </span>
              <span className="text-[13px] font-bold text-[#294941] shrink-0">
                {isEn ? 'Change' : 'تغيير'}
              </span>
            </button>

            {/*
              What it comes to, before they commit to it.

              This is the last screen before checkout, and the prep-time choice
              above carries a price of its own -- so the figure moves while the
              shopper is standing here. Showing it means «تأكيد وإتمام الطلب» is
              pressed on a known number rather than a remembered one from the
              header.

              «شامل الضريبة» because the option prices already carry the 15%, the
              same way the cart says it: a bare «المجموع الفرعي» in a store that
              prices VAT-inclusive invites the shopper to expect tax added on
              the next screen.

              Not a button -- filled rather than outlined, so it does not read
              as another thing to press next to the branch row above it.
            */}
            <div className="w-full mt-3 flex items-start justify-between gap-3 rounded-2xl bg-[#F2F6F5] px-4 py-3">
              {/*
                A note, not a label.

                It read «المجموع الفرعي (شامل الضريبة)», which answered only
                half of what a shopper wants to know here: the tax is inside
                the figure, but delivery is not -- that is quoted at checkout,
                once the branch and the address decide it. Saying so beside the
                number stops the total appearing to grow later for no reason
                the shopper was given.

                `items-start` because this wraps to two lines on a narrow
                screen, and the amount should stay level with its first line
                rather than drift to the middle of the sentence.
              */}
              <span className="text-[12px] leading-[1.5] text-[#5F7B75] font-medium">
                {isEn
                  ? 'VAT included. Delivery is calculated at checkout.'
                  : 'الضريبة مشمولة، ويتم احتساب تكلفة الشحن عند الدفع.'}
              </span>
              <span className="flex items-center gap-1.5 shrink-0" dir="ltr">
                <SaudiRiyalSymbol className="w-auto h-3.5 text-[#294941]" />
                <span className="text-[16px] font-black text-[#294941] font-en tracking-tight">
                  {calculateTotal().toFixed(2)}
                </span>
              </span>
            </div>

            <div className={`flex gap-4 w-full mt-4 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
              <button
                type="button"
                className="flex-1 py-3.5 rounded-full font-bold bg-[#294941] text-white hover:bg-[#1E3A34] transition-all text-[16px] disabled:opacity-50 flex items-center justify-center"
                onClick={handleCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? (isEn ? 'Preparing...' : 'جاري التحضير...') : (isEn ? 'Confirm & Checkout' : 'تأكيد وإتمام الطلب')}
              </button>
              <button
                type="button"
                className="px-6 py-3.5 rounded-full font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-[16px]"
                onClick={() => {
                  setIsPrepModalOpen(false);
                  setIsSubmitting(false);
                }}
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
