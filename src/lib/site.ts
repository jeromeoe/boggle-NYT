const configuredSiteUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

export const SITE_URL = configuredSiteUrl?.startsWith("http")
  ? configuredSiteUrl.replace(/\/$/, "")
  : "https://moggle.org";

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
