import { API_ORIGIN } from "../config/api";

const PRODUCT_SHARE_PATH_PREFIX = "/p/";

export function buildProductShareUrl(productId: number): string {
  return `${API_ORIGIN}${PRODUCT_SHARE_PATH_PREFIX}${productId}/`;
}

function parseNumericSegment(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseSharedProductId(url: string): number | null {
  try {
    const parsed = new URL(url);
    const queryProductId = parseNumericSegment(parsed.searchParams.get("productId") ?? parsed.searchParams.get("id") ?? undefined);
    if (queryProductId) {
      return queryProductId;
    }

    const host = parsed.host.replace(/^www\./, "");
    const rawPathSegments = parsed.pathname.split("/").filter(Boolean);
    const pathSegments =
      parsed.protocol === "onediningclub:" && host
        ? [host, ...rawPathSegments]
        : rawPathSegments;

    if (pathSegments.length >= 2 && pathSegments[0] === "products") {
      return parseNumericSegment(pathSegments[1]);
    }

    if (pathSegments.length >= 2 && pathSegments[0] === "p") {
      return parseNumericSegment(pathSegments[1]);
    }

    if (pathSegments.length >= 3 && pathSegments[0] === "links" && pathSegments[1] === "products") {
      return parseNumericSegment(pathSegments[2]);
    }

    return null;
  } catch {
    return null;
  }
}
