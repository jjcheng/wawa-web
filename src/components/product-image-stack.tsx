import type { Product } from "@/lib/api/types";

/** Shows the primary image with additional images fanned out behind it like a stack. */
export function ProductImageStack({
  product,
  className = "size-15",
  imageClassName = "rounded-md",
}: {
  product: Product;
  className?: string;
  imageClassName?: string;
}) {
  if (!product.image_url) return null;

  const extraImages = (product.additional_image_urls ?? []).filter(Boolean).slice(0, 2);
  const name = product.name || product.title || "Product";

  if (extraImages.length === 0) {
    return (
      <img
        src={product.image_url}
        alt={name}
        loading="lazy"
        className={`${className} ${imageClassName} object-cover`}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {extraImages.map((url, index) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className={`absolute inset-0 size-full border border-background object-cover ${imageClassName}`}
          style={{
            transform: `translate(${(index + 1) * 3}px, ${(index + 1) * -3}px)`,
            zIndex: extraImages.length - index,
          }}
        />
      ))}
      <img
        src={product.image_url}
        alt={name}
        loading="lazy"
        className={`relative size-full border border-background object-cover ${imageClassName}`}
        style={{ zIndex: extraImages.length + 1 }}
      />
    </div>
  );
}
