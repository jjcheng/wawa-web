import { z } from "zod";

export const agentWebsitesSchema = z
  .array(
    z.object({
      id: z.number().int().positive(),
      url: z.string(),
      exclude_patterns: z.array(z.string()).nullish(),
      added_at: z.string(),
    }),
  )
  .nullish()
  .transform((websites) => websites ?? []);

export const crawledPagesSchema = z.object({
  status: z.string(),
  total: z.number().int().nonnegative(),
  finished: z.number().int().nonnegative(),
  cursor: z.number().int(),
  records: z.array(
    z.object({
      url: z.string(),
      status: z.string(),
      markdown: z.string().nullish(),
      metadata: z.object({
        title: z.string(),
      }),
    }),
  ),
});

export type AgentWebsite = z.infer<typeof agentWebsitesSchema>[number];
export type CrawledPagesResponse = z.infer<typeof crawledPagesSchema>;

const websiteUrlSchema = z
  .string()
  .url()
  .refine((url) => /^https?:\/\//i.test(url));

function patternsFromLines(patterns: string) {
  return patterns
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildWebsitePayload(
  profileId: number,
  url: string,
  patterns: string,
  includedPatterns: string = "",
) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) throw new Error("URL is required.");
  if (!websiteUrlSchema.safeParse(trimmedUrl).success) {
    throw new Error("Enter a valid http or https URL.");
  }
  const excludePatterns = patternsFromLines(patterns);
  const includePatterns = patternsFromLines(includedPatterns);

  return {
    profile_id: profileId,
    url: trimmedUrl,
    ...(includePatterns.length > 0 ? { include_patterns: includePatterns } : {}),
    ...(excludePatterns.length > 0 ? { exclude_patterns: excludePatterns } : {}),
  };
}
