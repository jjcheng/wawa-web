/** Builds a link to Meta's WhatsApp Manager overview for a business portfolio/account pair. */
export function metaBusinessManagerUrl({
  portfolioId,
  accountId,
}: {
  portfolioId?: string | null;
  accountId?: string | null;
}): string | null {
  const trimmedPortfolioId = portfolioId?.trim();
  const trimmedAccountId = accountId?.trim();
  if (!trimmedPortfolioId || !trimmedAccountId) return null;

  return `https://business.facebook.com/latest/whatsapp_manager/overview?business_id=${encodeURIComponent(trimmedPortfolioId)}&asset_id=${encodeURIComponent(trimmedAccountId)}`;
}

/** Builds a link to Meta's WhatsApp Manager message templates tab for a business portfolio/account pair. */
export function metaManageTemplatesUrl({
  portfolioId,
  accountId,
}: {
  portfolioId?: string | null;
  accountId?: string | null;
}): string | null {
  const trimmedPortfolioId = portfolioId?.trim();
  const trimmedAccountId = accountId?.trim();
  if (!trimmedPortfolioId || !trimmedAccountId) return null;

  const params = new URLSearchParams({
    business_id: trimmedPortfolioId,
    tab: "message-templates",
    asset_id: trimmedAccountId,
  });

  return `https://business.facebook.com/latest/whatsapp_manager/message_templates/?${params}`;
}

/** Builds a link to Meta's Commerce Manager catalogs page for a business portfolio or specific catalog. */
export function metaCommerceManagerUrl({
  portfolioId,
  catalogId,
}: {
  portfolioId?: string | null;
  catalogId?: string | null;
} = {}): string | null {
  const trimmedPortfolioId = portfolioId?.trim();
  const trimmedCatalogId = catalogId?.trim();

  if (trimmedCatalogId && trimmedPortfolioId) {
    return `https://business.facebook.com/commerce_manager/catalogs/${encodeURIComponent(trimmedCatalogId)}/overview/?business_id=${encodeURIComponent(trimmedPortfolioId)}`;
  }
  if (trimmedCatalogId) {
    return `https://business.facebook.com/commerce_manager/catalogs/${encodeURIComponent(trimmedCatalogId)}/overview/`;
  }
  if (trimmedPortfolioId) {
    return `https://business.facebook.com/commerce_manager/catalogs/?business_id=${encodeURIComponent(trimmedPortfolioId)}`;
  }
  return "https://business.facebook.com/commerce_manager/";
}
