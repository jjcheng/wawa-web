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
