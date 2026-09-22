import type { Product } from "@/lib/api/types";

export function getProductName(product: Product) {
  return product.name || product.title || "Product";
}

export function getProductSlug(product: Product) {
  return getProductName(product).trim().toLowerCase().replace(/\s+/g, "-") || "product";
}

export function getPublicProductPath(product: Product) {
  return `/products/${encodeURIComponent(product.id)}/${encodeURIComponent(getProductSlug(product))}`;
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}