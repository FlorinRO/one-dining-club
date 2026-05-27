import type { VideoSource } from "expo-video";

import type { Product, Restaurant } from "../types/models";

type DemoVideoLicense = "free" | "restricted";

type DemoVideoItem = {
  id: number;
  source: VideoSource;
  title: string;
  label: string;
  keywords: string[];
  license: DemoVideoLicense;
};

type DemoProductVideoRequest =
  | number
  | {
      product?: Pick<Product, "name" | "category_name" | "description">;
      restaurant?: Pick<Restaurant, "name" | "description" | "categories">;
      fallbackIndex?: number;
    };

const mixkitCdnVideo = (id: number, quality: 720 | 1080 = 1080): VideoSource => ({
  uri: `https://assets.mixkit.co/videos/${id}/${id}-${quality}.mp4`,
  contentType: "progressive",
  useCaching: false,
});

const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const positiveModulo = (value: number, length: number) => ((value % length) + length) % length;

const cdnFoodVideos: DemoVideoItem[] = [
  {
    id: 44001,
    source: mixkitCdnVideo(44001),
    title: "Close up shot of a pepperoni pizza",
    label: "cdn://mixkit/44001",
    keywords: ["pizza", "diavola", "margherita", "pepperoni", "napoli", "slice", "focaccia"],
    license: "free",
  },
  {
    id: 42477,
    source: mixkitCdnVideo(42477),
    title: "Putting pepperoni on a pizza",
    label: "cdn://mixkit/42477",
    keywords: ["pizza", "pepperoni", "diavola", "mozzarella", "napoli", "slice"],
    license: "free",
  },
  {
    id: 42474,
    source: mixkitCdnVideo(42474),
    title: "Smearing sauce on the pizza",
    label: "cdn://mixkit/42474",
    keywords: ["pizza", "tomato", "sauce", "arrabbiata", "margherita", "focaccia"],
    license: "free",
  },
  {
    id: 12171,
    source: mixkitCdnVideo(12171),
    title: "Serving Parmesan cheese in spaghetti bolognese",
    label: "cdn://mixkit/12171",
    keywords: ["pasta", "spaghetti", "tagliatelle", "carbonara", "bolognese", "parmesan", "cacio", "linguine", "rigatoni", "pappardelle", "arrabbiata", "gnocchi", "lasagna", "ravioli"],
    license: "free",
  },
  {
    id: 2433,
    source: mixkitCdnVideo(2433),
    title: "Fork in fettuccine",
    label: "cdn://mixkit/2433",
    keywords: ["pasta", "fettuccine", "tagliatelle", "linguine", "carbonara", "tartufo", "truffle", "cacio", "pepe", "mafalde"],
    license: "free",
  },
  {
    id: 3800,
    source: mixkitCdnVideo(3800),
    title: "Ingredients for preparing meat balls",
    label: "cdn://mixkit/3800",
    keywords: ["meatball", "meat", "beef", "kofta", "sauce", "bolognese", "stew", "meat balls"],
    license: "free",
  },
  {
    id: 51238,
    source: mixkitCdnVideo(51238),
    title: "Girls eating ramen at the restaurant",
    label: "cdn://mixkit/51238",
    keywords: ["ramen", "noodle", "noodles", "miso", "shoyu", "tonkotsu", "pho", "udon", "soup", "asian", "japanese"],
    license: "free",
  },
  {
    id: 51236,
    source: mixkitCdnVideo(51236),
    title: "Young woman eating ramen at a restaurant table",
    label: "cdn://mixkit/51236",
    keywords: ["ramen", "noodle", "noodles", "miso", "tonkotsu", "pho", "udon", "soup", "japanese"],
    license: "free",
  },
  {
    id: 41350,
    source: mixkitCdnVideo(41350),
    title: "Woman eating noodles",
    label: "cdn://mixkit/41350",
    keywords: ["noodle", "noodles", "udon", "wok", "stir", "teriyaki", "rice box", "noodle box", "japchae", "asian"],
    license: "free",
  },
  {
    id: 48658,
    source: mixkitCdnVideo(48658, 720),
    title: "Japanese sushi rolls with chopsticks",
    label: "cdn://mixkit/48658",
    keywords: ["sushi", "roll", "maki", "nigiri", "salmon sushi", "tuna", "wasabi", "japanese", "seafood"],
    license: "restricted",
  },
  {
    id: 32518,
    source: mixkitCdnVideo(32518, 720),
    title: "Fresh salmon sushi close up",
    label: "cdn://mixkit/32518",
    keywords: ["sushi", "salmon", "nigiri", "maki", "roll", "poke", "seafood", "japanese"],
    license: "restricted",
  },
  {
    id: 20765,
    source: mixkitCdnVideo(20765, 720),
    title: "Preparing a roll of Sushi",
    label: "cdn://mixkit/20765",
    keywords: ["sushi", "roll", "maki", "chef", "japanese", "seafood", "salmon"],
    license: "restricted",
  },
  {
    id: 372,
    source: mixkitCdnVideo(372, 720),
    title: "Man eating a hamburger",
    label: "cdn://mixkit/372",
    keywords: ["burger", "hamburger", "cheeseburger", "smash", "bun", "double smash", "chicken burger", "sandwich"],
    license: "free",
  },
  {
    id: 3552,
    source: mixkitCdnVideo(3552),
    title: "Burgers on plates on a table",
    label: "cdn://mixkit/3552",
    keywords: ["burger", "hamburger", "cheeseburger", "smash", "fries", "loaded fries", "bun"],
    license: "free",
  },
  {
    id: 2774,
    source: mixkitCdnVideo(2774),
    title: "Steak on the BBQ grill",
    label: "cdn://mixkit/2774",
    keywords: ["bbq", "barbecue", "grill", "steak", "brisket", "ribs", "souvlaki", "kebab", "smoke", "smoked", "pitmaster", "sausage", "meat"],
    license: "free",
  },
  {
    id: 3802,
    source: mixkitCdnVideo(3802),
    title: "Making breaded meat",
    label: "cdn://mixkit/3802",
    keywords: ["schnitzel", "breaded", "chicken", "karaage", "katsu", "tonkatsu", "wings", "dakgangjeong", "meat"],
    license: "free",
  },
  {
    id: 40521,
    source: mixkitCdnVideo(40521),
    title: "Eating salad with a fork",
    label: "cdn://mixkit/40521",
    keywords: ["salad", "caesar", "healthy", "green", "halloumi", "quinoa", "kale", "tabbouleh", "lunch"],
    license: "free",
  },
  {
    id: 40531,
    source: mixkitCdnVideo(40531),
    title: "Detailed view of a healthy salad",
    label: "cdn://mixkit/40531",
    keywords: ["salad", "healthy", "green", "avocado", "kale", "quinoa", "caesar", "bowl", "fit"],
    license: "free",
  },
  {
    id: 43925,
    source: mixkitCdnVideo(43925),
    title: "Preparing a bowl with yogurt and fruit",
    label: "cdn://mixkit/43925",
    keywords: ["bowl", "yogurt", "granola", "fruit", "breakfast", "chia", "smoothie", "recovery", "healthy", "brunch"],
    license: "free",
  },
  {
    id: 40524,
    source: mixkitCdnVideo(40524),
    title: "Top view of a woman slicing vegetables",
    label: "cdn://mixkit/40524",
    keywords: ["vegetable", "vegetables", "veggie", "vegan", "tofu", "salad", "bowl", "fresh", "tomato", "avocado"],
    license: "free",
  },
  {
    id: 52457,
    source: mixkitCdnVideo(52457),
    title: "Fresh tomato slices falling into lettuce",
    label: "cdn://mixkit/52457",
    keywords: ["salad", "lettuce", "tomato", "healthy", "green", "fresh", "vegetable", "caesar"],
    license: "free",
  },
  {
    id: 10434,
    source: mixkitCdnVideo(10434),
    title: "Rinsing strawberries, apples and grapes",
    label: "cdn://mixkit/10434",
    keywords: ["fruit", "strawberry", "berry", "apple", "grape", "sorbet", "smoothie", "fresh", "dessert"],
    license: "free",
  },
  {
    id: 42910,
    source: mixkitCdnVideo(42910),
    title: "Woman flipping her egg omelet",
    label: "cdn://mixkit/42910",
    keywords: ["egg", "eggs", "omelet", "omelette", "breakfast", "brunch", "benedict", "shakshuka", "sando"],
    license: "free",
  },
  {
    id: 43903,
    source: mixkitCdnVideo(43903, 720),
    title: "Woman cutting slices of sliced bread",
    label: "cdn://mixkit/43903",
    keywords: ["bread", "toast", "sandwich", "bagel", "croissant", "focaccia", "pita", "wrap", "shawarma", "taco", "quesadilla", "burrito", "tostada", "bun"],
    license: "free",
  },
  {
    id: 43905,
    source: mixkitCdnVideo(43905, 720),
    title: "Blending a fruit smoothie in a blender",
    label: "cdn://mixkit/43905",
    keywords: ["smoothie", "juice", "fruit", "mango", "shake", "milkshake", "blend", "drink"],
    license: "free",
  },
  {
    id: 41859,
    source: mixkitCdnVideo(41859),
    title: "Serving a sparkling cappuccino in a cup",
    label: "cdn://mixkit/41859",
    keywords: ["coffee", "cappuccino", "flat white", "espresso", "latte", "affogato", "cold brew", "granita"],
    license: "free",
  },
  {
    id: 236,
    source: mixkitCdnVideo(236),
    title: "Filling a white cup of coffee",
    label: "cdn://mixkit/236",
    keywords: ["coffee", "espresso", "flat white", "latte", "cappuccino", "cold brew", "granita"],
    license: "free",
  },
  {
    id: 4985,
    source: mixkitCdnVideo(4985),
    title: "Coffee beans falling into a coffee pot",
    label: "cdn://mixkit/4985",
    keywords: ["coffee", "espresso", "beans", "brew", "barista"],
    license: "free",
  },
  {
    id: 50018,
    source: mixkitCdnVideo(50018),
    title: "Pastry chef putting bitumen on a cake",
    label: "cdn://mixkit/50018",
    keywords: ["dessert", "cake", "pastry", "tiramisu", "cheesecake", "lava", "chocolate", "baklava", "cannoli"],
    license: "free",
  },
  {
    id: 50051,
    source: mixkitCdnVideo(50051),
    title: "Cake with letter candles that say Happy Birthday",
    label: "cdn://mixkit/50051",
    keywords: ["dessert", "cake", "birthday", "chocolate", "lava", "cheesecake", "tiramisu", "gelato", "pancake"],
    license: "free",
  },
  {
    id: 40830,
    source: mixkitCdnVideo(40830),
    title: "Young woman giving a big bite a donut",
    label: "cdn://mixkit/40830",
    keywords: ["donut", "dessert", "sweet", "churro", "pancake", "baklava", "mochi", "gelato"],
    license: "free",
  },
];

const getFallbackVideo = (index: number) => cdnFoodVideos[positiveModulo(index, cdnFoodVideos.length)];

const scoreKeyword = (keyword: string, request: Exclude<DemoProductVideoRequest, number>) => {
  const normalizedKeyword = normalizeText(keyword);
  const productName = normalizeText(request.product?.name);
  const categoryName = normalizeText(request.product?.category_name);
  const productDescription = normalizeText(request.product?.description);
  const restaurantName = normalizeText(request.restaurant?.name);
  const restaurantDescription = normalizeText(request.restaurant?.description);
  const restaurantCategories = normalizeText(request.restaurant?.categories?.map((category) => category.name).join(" "));

  if (!normalizedKeyword) return 0;

  let score = 0;
  if (productName.includes(normalizedKeyword)) score += 10;
  if (categoryName.includes(normalizedKeyword)) score += 6;
  if (productDescription.includes(normalizedKeyword)) score += 3;
  if (restaurantCategories.includes(normalizedKeyword)) score += 3;
  if (restaurantName.includes(normalizedKeyword)) score += 2;
  if (restaurantDescription.includes(normalizedKeyword)) score += 2;
  return score;
};

const scoreVideo = (video: DemoVideoItem, request: Exclude<DemoProductVideoRequest, number>) =>
  video.keywords.reduce((score, keyword) => score + scoreKeyword(keyword, request), 0);

const selectDemoProductVideo = (request: DemoProductVideoRequest) => {
  if (typeof request === "number") return getFallbackVideo(request);

  const scoredVideos = cdnFoodVideos.map((video) => ({ video, score: scoreVideo(video, request) }));
  const bestScore = Math.max(...scoredVideos.map((item) => item.score));

  if (bestScore <= 0) return getFallbackVideo(request.fallbackIndex ?? 0);

  const relevantVideos = scoredVideos
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const candidates = relevantVideos
    .filter((item) => item.score >= Math.max(1, bestScore - 6))
    .slice(0, 6)
    .map((item) => item.video);

  return candidates[positiveModulo(request.fallbackIndex ?? 0, candidates.length)];
};

export const demoProductVideoIds = cdnFoodVideos.map((item) => item.id);

export const getDemoProductVideoSource = (request: DemoProductVideoRequest) => selectDemoProductVideo(request).source;

export const getDemoProductVideoLabel = (request: DemoProductVideoRequest) => selectDemoProductVideo(request).label;

export const getDemoProductVideoTitle = (request: DemoProductVideoRequest) => selectDemoProductVideo(request).title;
