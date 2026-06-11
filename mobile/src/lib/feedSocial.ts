import { Product, Restaurant } from "../types/models";

export type FeedReply = {
  id: string;
  author: string;
  text: string;
  likes: number;
  isLiked?: boolean;
  minutesAgo: number;
  createdAt?: number;
  photos?: string[];
};

export type FeedComment = FeedReply & {
  replies?: FeedReply[];
};

const COMMENT_AUTHORS = [
  "anafoodie",
  "mihai.eats",
  "ioana.citybites",
  "cris.munch",
  "teo.delivery",
  "diana.taste",
  "alexandru_88",
  "andreea.snacks",
];

const COMMENT_TEMPLATES = [
  "Super bun, am comandat deja de 2 ori.",
  "Portie mare si foarte gustos.",
  "Exact ca in video, recomand.",
  "A ajuns rapid si cald.",
  "Foarte fresh, clar mai comand.",
  "Raport pret-calitate top.",
  "Combinatie foarte buna de arome.",
  "Merita incercat, 10/10.",
];

export const productKey = (restaurantId: number, productId: number) => `${restaurantId}:${productId}`;

export const compactCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

export const formatCommentAge = (minutesAgo: number) => {
  if (minutesAgo < 1) return "acum";
  if (minutesAgo < 60) return `${minutesAgo}m`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d`;
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 5) return `${weeksAgo}w`;
  return `${Math.floor(daysAgo / 30)}mo`;
};

export const minutesSinceCreated = (createdAt?: number, fallbackMinutesAgo = 0, now = Date.now()) =>
  createdAt ? Math.max(0, Math.floor((now - createdAt) / 60000)) : fallbackMinutesAgo;

export const statsFor = (restaurant: Restaurant, product: Product) => {
  const seed = restaurant.id * 41 + product.id * 17;
  return {
    likes: 1400 + (seed % 82) * 137,
    comments: 28 + (seed % 64),
    shares: 12 + (seed % 33),
  };
};

export const buildFeedComments = (restaurant: Restaurant, product: Product, total: number): FeedComment[] =>
  Array.from({ length: Math.min(Math.max(total + 56, 64), 180) }).map((_, index) => {
    const seed = restaurant.id * 53 + product.id * 19 + index * 7;
    return {
      id: `${restaurant.id}:${product.id}:${index}`,
      author: COMMENT_AUTHORS[seed % COMMENT_AUTHORS.length],
      text: `${COMMENT_TEMPLATES[(seed + index) % COMMENT_TEMPLATES.length]} ${index % 3 === 0 ? product.name : restaurant.name}.`,
      likes: 2 + (seed % 97),
      minutesAgo: 3 + (seed % 320),
    };
  });
