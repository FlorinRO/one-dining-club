import { API_ORIGIN } from "../config/api";

export const FALLBACK_RESTAURANT_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=1400&auto=format&fit=crop";
export const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
export const FALLBACK_HERO_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop";

type RestaurantImageContext = {
  id?: number;
  name?: string;
  slug?: string;
  description?: string;
  categories?: Array<{ name?: string }>;
};

const restaurantImagePools: Array<{ keywords: string[]; images: string[] }> = [
  {
    keywords: ["luna", "rossa", "italian", "pizza", "diavola", "focaccia"],
    images: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["pasta", "carbonara", "fresca", "arrabbiata", "lasagna", "gnocchi"],
    images: [
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["wok", "asian", "bao", "teriyaki", "noodle"],
    images: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["sushi", "nigiri", "maki", "poke"],
    images: [
      "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["ramen", "umami", "japanese", "tokyo", "udon"],
    images: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1557872943-16a5ac26437e?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["burger", "smash", "cheeseburger", "loaded"],
    images: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["healthy", "fit", "green", "bowl", "salad", "salate", "protein"],
    images: [
      "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["coffee", "brunch", "bagel", "breakfast", "pancake"],
    images: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["dessert", "sweet", "gelato", "tiramisu", "cake", "churro"],
    images: [
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["mexican", "taco", "neon", "quesadilla", "burrito", "nachos"],
    images: [
      "https://images.unsplash.com/photo-1565299585323-38174c4a6471?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["bbq", "grill", "brisket", "ribs", "balkan", "steak"],
    images: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["korean", "seoul", "crispy", "gochujang", "bibimbap"],
    images: [
      "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1617835429239-6a7f19f2329a?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["middle eastern", "levant", "falafel", "shawarma", "kebab", "turkish", "hummus"],
    images: [
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["seafood", "fish", "salmon", "shrimp"],
    images: [
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["soup", "soups", "pho", "vietnamese"],
    images: [
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=1400&auto=format&fit=crop",
    ],
  },
];

const genericRestaurantFallbacks = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=1400&auto=format&fit=crop",
];

function normalizeImageText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hashText(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function buildRestaurantImageFallback(context?: RestaurantImageContext) {
  const contextText = normalizeImageText(
    [
      context?.name,
      context?.slug,
      context?.description,
      ...(context?.categories?.map((category) => category.name) ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const seedText = contextText || String(context?.id ?? 1);
  const matchedPool = restaurantImagePools.find((pool) => pool.keywords.some((keyword) => contextText.includes(keyword)));
  const images = matchedPool?.images ?? genericRestaurantFallbacks;
  const seed = hashText(seedText) + (context?.id ?? 0);

  return images[seed % images.length];
}

export function resolveImageUri(uri: string | null | undefined, fallback: string) {
  if (!uri) return fallback;

  // URLs locale din backend nu sunt accesibile pe telefon fizic
  if (uri.includes("127.0.0.1") || uri.includes("localhost")) {
    return fallback;
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  if (uri.startsWith("/")) {
    return `${API_ORIGIN}${uri}`;
  }

  // Accept relative media paths like "media/products/file.jpg"
  if (uri.startsWith("media/")) {
    return `${API_ORIGIN}/${uri}`;
  }

  return fallback;
}

export function resolveRestaurantImageUri(uri: string | null | undefined, restaurantId?: number, context?: RestaurantImageContext) {
  const fallback = buildRestaurantImageFallback({ ...context, id: context?.id ?? restaurantId });
  if (uri) return resolveImageUri(uri, fallback);
  return fallback;
}

export function resolveProductImageUri(uri: string | null | undefined, productId?: number) {
  if (uri) return resolveImageUri(uri, FALLBACK_PRODUCT_IMAGE);
  const seed = productId ?? 1;
  return `${FALLBACK_PRODUCT_IMAGE}&sig=prod-${seed}`;
}
