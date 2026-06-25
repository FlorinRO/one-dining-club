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
  updated_at?: string;
  categories?: Array<{ name?: string }>;
};

const restaurantAvatarBySlug: Record<string, string> = {
  "romanian-grill-house": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=900&auto=format&fit=crop",
  "grill-house": "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=900&auto=format&fit=crop",
  "sakura-bistro": "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=900&auto=format&fit=crop",
  "dolce-notte": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "umami-reels": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "sushi-neo": "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=900&auto=format&fit=crop",
  "bistro-fusion": "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=900&auto=format&fit=crop",
  "casa-pastelor": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=900&auto=format&fit=crop",
  "pasta-fresca-studio": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=900&auto=format&fit=crop",
  "ravioli-atelier": "https://images.unsplash.com/photo-1484980972926-edee96e0960d?q=80&w=900&auto=format&fit=crop",
  "luna-rossa-kitchen": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=900&auto=format&fit=crop",
  "wok-yard": "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=900&auto=format&fit=crop",
  "pizzeria-napoli": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=900&auto=format&fit=crop",
  "napoli-slice-club": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=900&auto=format&fit=crop",
  "burger-forge": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop",
  "smash-station": "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=900&auto=format&fit=crop",
  "green-ember": "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=900&auto=format&fit=crop",
  "fresh-garden": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=900&auto=format&fit=crop",
  "brunch-cafe": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=900&auto=format&fit=crop",
  "morning-bakery-lab": "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=900&auto=format&fit=crop",
  "breakfast-republic": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=900&auto=format&fit=crop",
  "barul-de-cafea": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
  "cafeaua-de-specialitate": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=900&auto=format&fit=crop",
  "coffee-and-dessert": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "soup-ritual": "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=900&auto=format&fit=crop",
  "pho-pulse": "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=900&auto=format&fit=crop",
  "wrap-lab": "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=900&auto=format&fit=crop",
  "kebab-dock": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?q=80&w=900&auto=format&fit=crop",
  "anatolia-grill": "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=900&auto=format&fit=crop",
  "pita-garden": "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=900&auto=format&fit=crop",
  "taqueria-norte": "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=900&auto=format&fit=crop",
  "gusturi-din-lume": "https://images.unsplash.com/photo-1565299585323-38174c4a6471?q=80&w=900&auto=format&fit=crop",
  "ocean-bento": "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=900&auto=format&fit=crop",
  "nordic-fish-bar": "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=900&auto=format&fit=crop",
  "seoul-crunch": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=900&auto=format&fit=crop",
  "dolce-forno": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "balkan-platter-co": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=700&auto=format&fit=crop",
};

const restaurantAvatarByName: Record<string, string> = {
  "coffee & dessert": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "coffe & dessert": "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=900&auto=format&fit=crop",
  "sakura bistro": "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=900&auto=format&fit=crop",
  "gusturi din lume": "https://images.unsplash.com/photo-1565299585323-38174c4a6471?q=80&w=900&auto=format&fit=crop",
  "pizzeria napoli": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=900&auto=format&fit=crop",
};

const restaurantImagePools: Array<{ keywords: string[]; images: string[] }> = [
  {
    keywords: ["luna", "rossa", "italian", "pizza", "pizzeria", "diavola", "focaccia"],
    images: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["pasta", "paste", "carbonara", "fresca", "arrabbiata", "lasagna", "gnocchi"],
    images: [
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["wok", "asian", "asiatic", "bao", "teriyaki", "noodle"],
    images: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["sushi", "nigiri", "maki", "poke", "sakura"],
    images: [
      "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["ramen", "umami", "japanese", "tokyo", "udon", "japonez"],
    images: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1557872943-16a5ac26437e?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["burger", "burgeri", "smash", "cheeseburger", "loaded"],
    images: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["healthy", "fit", "green", "bowl", "salad", "salata", "salate", "protein"],
    images: [
      "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["coffee", "cafea", "cafenea", "brunch", "bagel", "breakfast", "pancake", "bakery"],
    images: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["dessert", "sweet", "gelato", "tiramisu", "cake", "churro", "desert"],
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
    keywords: ["bbq", "grill", "gratar", "gratarul", "brisket", "ribs", "balkan", "steak", "mici", "ceafa"],
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
    keywords: ["middle eastern", "levant", "falafel", "shawarma", "kebab", "turkish", "hummus", "wrap"],
    images: [
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["seafood", "fish", "salmon", "shrimp", "peste"],
    images: [
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1400&auto=format&fit=crop",
    ],
  },
  {
    keywords: ["soup", "soups", "supa", "supe", "ciorba", "ciorbe", "pho", "vietnamese"],
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

function appendImageVersion(uri: string, version?: string) {
  if (!version || uri.startsWith("data:")) return uri;
  return `${uri}${uri.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function buildRestaurantContextText(context?: RestaurantImageContext) {
  return normalizeImageText(
    [
      context?.name,
      context?.slug,
      context?.description,
      ...(context?.categories?.map((category) => category.name) ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function findRestaurantAvatarOverride(context?: RestaurantImageContext) {
  const slug = normalizeImageText(context?.slug ?? "").trim();
  if (slug && restaurantAvatarBySlug[slug]) {
    return restaurantAvatarBySlug[slug];
  }

  const rawName = normalizeImageText(context?.name ?? "").trim();
  if (rawName && restaurantAvatarByName[rawName]) {
    return restaurantAvatarByName[rawName];
  }

  const dashedName = rawName.replace(/\s+/g, "-");
  if (dashedName && restaurantAvatarBySlug[dashedName]) {
    return restaurantAvatarBySlug[dashedName];
  }

  return null;
}

function buildRestaurantImageFallback(context?: RestaurantImageContext) {
  const override = findRestaurantAvatarOverride(context);
  if (override) return override;

  const contextText = buildRestaurantContextText(context);
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
  if (uri) return appendImageVersion(resolveImageUri(uri, fallback), context?.updated_at);

  const override = findRestaurantAvatarOverride({ ...context, id: context?.id ?? restaurantId });
  return override ?? fallback;
}

export function resolveRestaurantAvatarFallbackUri(restaurant: RestaurantImageContext) {
  const override = findRestaurantAvatarOverride(restaurant);
  if (override) return override;
  return buildRestaurantImageFallback(restaurant);
}

export function resolveRestaurantAvatarUri(restaurant: RestaurantImageContext & { logo?: string | null; cover_image?: string | null }) {
  const fallback = resolveRestaurantAvatarFallbackUri(restaurant);
  if (restaurant.logo) return appendImageVersion(resolveImageUri(restaurant.logo, fallback), restaurant.updated_at);
  if (restaurant.cover_image) return appendImageVersion(resolveImageUri(restaurant.cover_image, fallback), restaurant.updated_at);
  return fallback;
}

export function resolveProductImageUri(uri: string | null | undefined, productId?: number) {
  if (uri) return resolveImageUri(uri, FALLBACK_PRODUCT_IMAGE);
  const seed = productId ?? 1;
  return `${FALLBACK_PRODUCT_IMAGE}&sig=prod-${seed}`;
}
