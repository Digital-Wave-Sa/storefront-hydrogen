/**
 * What a product shows when it has no photo in Shopify: its own name.
 *
 * It used to be /images/placeholder/sample.png -- a real-looking chocolate
 * dessert -- so a product with no photo (Kunafa Flan Cake, Sept 2026) looked
 * like that dessert on its card, in the cart and in search, while the product
 * page said «لا يوجد صورة». A shopper could order it expecting the picture.
 * The name cannot be mistaken for a photo, and it reads the same everywhere.
 *
 * Fills its parent (w-full h-full); the parent sets size and corner radius.
 */
type NoImageProps = {
  title?: string | null;
  /** sm = cart / search thumbnails, md = product cards, lg = product page. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const TEXT: Record<NonNullable<NoImageProps['size']>, string> = {
  sm: 'p-1.5 text-[9px] leading-tight line-clamp-3',
  md: 'p-4 text-sm md:text-base leading-snug line-clamp-3',
  lg: 'p-8 text-xl md:text-2xl leading-snug line-clamp-4',
};

export function NoImage({title, size = 'md', className = ''}: NoImageProps) {
  const name = (title || '').trim();
  return (
    <div
      role="img"
      aria-label={name}
      className={`w-full h-full flex items-center justify-center bg-[#F4EFE6] ${className}`}
    >
      <span
        className={`max-w-full text-center font-bold text-[#234745] break-words [text-wrap:balance] ${TEXT[size]}`}
      >
        {name}
      </span>
    </div>
  );
}
