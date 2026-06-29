const LOCAL_DASHBOARD_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const DASHBOARD_CONFIG = window.YUMZY_DASHBOARD_CONFIG || {};
const FALLBACK_API_BASE = LOCAL_DASHBOARD_HOSTS.has(location.hostname)
  ? "http://127.0.0.1:8000/api"
  : "https://api.yumzy.ro/api";
const QUERY_API_BASE = normalizeConfiguredApiBase(
  new URLSearchParams(location.search).get("api") || new URLSearchParams(location.search).get("apiBase"),
);
const STORED_API_BASE = normalizeConfiguredApiBase(localStorage.getItem("yumzyDashboardApiBase"));
const QUERY_GOOGLE_MAPS_API_KEY = normalizeConfiguredGoogleMapsApiKey(
  new URLSearchParams(location.search).get("googleMapsApiKey") ||
    new URLSearchParams(location.search).get("gmapsKey") ||
    new URLSearchParams(location.search).get("googlePlacesApiKey"),
);
if (QUERY_API_BASE) {
  localStorage.setItem("yumzyDashboardApiBase", QUERY_API_BASE);
}
if (QUERY_GOOGLE_MAPS_API_KEY) {
  localStorage.setItem("yumzyDashboardGoogleMapsApiKey", QUERY_GOOGLE_MAPS_API_KEY);
}
const DEFAULT_API_BASE =
  QUERY_API_BASE ||
  (LOCAL_DASHBOARD_HOSTS.has(location.hostname) ? FALLBACK_API_BASE : STORED_API_BASE || FALLBACK_API_BASE);
const CONFIG_GOOGLE_MAPS_API_KEY = normalizeConfiguredGoogleMapsApiKey(DASHBOARD_CONFIG.googleMapsApiKey);
const GOOGLE_MAPS_API_KEY =
  CONFIG_GOOGLE_MAPS_API_KEY ||
  QUERY_GOOGLE_MAPS_API_KEY ||
  localStorage.getItem("yumzyDashboardGoogleMapsApiKey") ||
  "";
const DAY_LABELS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const ORDER_STATUS_LABELS = {
  pending: "În așteptare",
  accepted: "Acceptată",
  preparing: "În preparare",
  ready_for_pickup: "Gata de ridicare",
  picked_up: "Preluată",
  on_the_way: "Pe drum",
  delivered: "Livrată",
  cancelled: "Anulată",
  rejected: "Respinsă",
};
const OWNER_STATUS_OPTIONS = [
  "accepted",
  "preparing",
  "ready_for_pickup",
  "rejected",
  "cancelled",
];
const ORDER_FILTER_STATUS_OPTIONS = [
  { value: "pending", label: "În așteptare" },
  { value: "accepted", label: "Acceptate" },
  { value: "preparing", label: "În preparare" },
  { value: "ready_for_pickup", label: "Gata" },
  { value: "picked_up", label: "Preluate" },
  { value: "on_the_way", label: "Pe drum" },
  { value: "delivered", label: "Livrate" },
  { value: "rejected", label: "Respinse" },
  { value: "cancelled", label: "Anulate" },
];
const FULFILLMENT_TYPE_LABELS = {
  delivery: "Livrare",
  pickup: "Ridicare",
};
const PAYMENT_METHOD_LABELS = {
  cash: "Numerar",
  card: "Card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
};
const PAYMENT_STATUS_LABELS = {
  unpaid: "Neplătită",
  pending: "În așteptare",
  paid: "Plătită",
  failed: "Eșuată",
  refunded: "Rambursată",
};
const FALLBACK_RESTAURANT_AVATAR =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=900&auto=format&fit=crop";
const RESTAURANT_AVATAR_OVERRIDES = {
  "luna-rossa-kitchen": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=900&auto=format&fit=crop",
  "pizzeria-napoli": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=900&auto=format&fit=crop",
  "wok-yard": "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=900&auto=format&fit=crop",
  "burger-craft": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop",
  "green-fork": "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=900&auto=format&fit=crop",
};
const RESTAURANT_AVATAR_NAME_OVERRIDES = {
  "pizzeria napoli": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=900&auto=format&fit=crop",
};
const MAX_DELIVERY_FEE = 50;
const MAX_MINIMUM_ORDER = 300;
const MIN_DELIVERY_TIME_MINUTES = 10;
const MAX_DELIVERY_TIME_MINUTES = 180;
const SUPPORT_EMAIL = "support@yumzy.ro";
const DEFAULT_DASHBOARD_VIEW = "overview";
const NAV_ITEMS = [
  { view: "overview", label: "Overview", icon: "ri-dashboard-2-line" },
  { view: "profile", label: "Profil restaurant", icon: "ri-store-2-line" },
  { view: "products", label: "Produse & video", icon: "ri-video-on-line" },
  { view: "orders", label: "Comenzi", icon: "ri-bill-line" },
  { view: "account", label: "Cont", icon: "ri-user-settings-line" },
];
const PRODUCT_TYPE_OPTIONS = [
  { value: "pizza", label: "Pizza" },
  { value: "burger", label: "Burgeri" },
  { value: "shawarma", label: "Shaorma" },
  { value: "asian", label: "Asiatic" },
  { value: "sushi", label: "Sushi" },
  { value: "pasta", label: "Paste" },
  { value: "grill", label: "Grill" },
  { value: "salad", label: "Salate" },
  { value: "soup", label: "Supe" },
  { value: "breakfast", label: "Mic dejun" },
  { value: "dessert", label: "Desert" },
  { value: "bakery", label: "Panificație" },
  { value: "drinks", label: "Băuturi" },
  { value: "seafood", label: "Fructe de mare" },
  { value: "fish", label: "Pește" },
  { value: "other", label: "Altele" },
];
const EMPTY_INGREDIENT_ROW = { name: "", grams: "", calories: "", price_per_20g: "", can_add_extra: "true" };
const INGREDIENT_CATALOG_GROUPS = {
  basics: [
    "apă",
    "apă minerală",
    "sare",
    "piper",
    "piper alb",
    "piper verde",
    "zahăr",
    "zahăr brun",
    "zahăr pudră",
    "miere",
    "sirop de arțar",
    "vanilie",
    "esență de vanilie",
    "cacao",
    "ciocolată neagră",
    "ciocolată cu lapte",
    "ciocolată albă",
    "cafea",
    "espresso",
    "ceai verde",
  ],
  bakery: [
    "făină albă",
    "făină integrală",
    "făină de secară",
    "făină de migdale",
    "mălai",
    "pesmet",
    "drojdie",
    "praf de copt",
    "bicarbonat de sodiu",
    "blat de pizza",
    "aluat de pizza",
    "aluat foietaj",
    "lipie",
    "lipie libaneză",
    "chiflă",
    "chiflă brioche",
    "baghetă",
    "pâine albă",
    "pâine integrală",
    "focaccia",
    "toast",
    "crutoane",
    "foi de tortilla",
    "wrap",
    "foi de plăcintă",
    "taco shell",
    "nachos",
  ],
  dairyAndEggs: [
    "ou",
    "albuș de ou",
    "gălbenuș de ou",
    "lapte",
    "lapte condensat",
    "lapte de cocos",
    "lapte de migdale",
    "lapte de ovăz",
    "smântână",
    "smântână de gătit",
    "iaurt",
    "iaurt grecesc",
    "unt",
    "unt clarifiat",
    "frișcă",
    "parmezan",
    "pecorino",
    "grana padano",
    "mozzarella",
    "mozzarella fior di latte",
    "burrata",
    "ricotta",
    "gorgonzola",
    "brie",
    "camembert",
    "cașcaval",
    "cașcaval afumat",
    "telemea",
    "halloumi",
    "feta",
    "cheddar",
    "emmentaler",
    "gouda",
    "mascarpone",
    "cremă de brânză",
    "brânză de capră",
  ],
  oilsAndSauces: [
    "ulei de floarea-soarelui",
    "ulei de măsline",
    "ulei de susan",
    "ulei de trufe",
    "ulei picant",
    "oțet",
    "oțet balsamic",
    "oțet din vin roșu",
    "sos de soia",
    "sos teriyaki",
    "sos Worcestershire",
    "sos hoisin",
    "sos de pește",
    "sos ponzu",
    "muștar",
    "muștar Dijon",
    "maioneză",
    "ketchup",
    "pastă de tomate",
    "bulion",
    "sos barbecue",
    "sos sweet chilli",
    "sos de usturoi",
    "sos cocktail",
    "sos chilli",
    "sos tzatziki",
    "sos ranch",
    "sos Caesar",
    "sos aioli",
    "sos sriracha",
    "sos tahini",
    "sos pesto",
    "sos marinara",
    "sos Alfredo",
    "sos de brânză",
    "sos de ciuperci",
    "sos de vin",
    "glazură teriyaki",
    "dressing de iaurt",
    "dressing de lămâie",
  ],
  vegetables: [
    "usturoi",
    "ceapă",
    "ceapă roșie",
    "ceapă albă",
    "ceapă verde",
    "șalotă",
    "praz",
    "ghimbir",
    "ardei gras",
    "ardei kapia",
    "ardei iute",
    "ardei jalapeno",
    "ardei copt",
    "roșii",
    "roșii cherry",
    "roșii uscate",
    "castravete",
    "castravete murat",
    "castraveți murați",
    "morcov",
    "țelină",
    "rădăcină de pătrunjel",
    "păstârnac",
    "cartofi",
    "cartofi noi",
    "cartofi dulci",
    "dovlecel",
    "vânătă",
    "broccoli",
    "conopidă",
    "spanac",
    "baby spanac",
    "varză albă",
    "varză roșie",
    "varză kale",
    "salată verde",
    "salată iceberg",
    "salată romană",
    "rucola",
    "mix de salată",
    "ciuperci champignon",
    "ciuperci pleurotus",
    "ciuperci shiitake",
    "hribi",
    "porumb",
    "mazăre",
    "fasole verde",
    "fasole roșie",
    "fasole neagră",
    "năut",
    "linte",
    "edamame",
    "sparanghel",
    "ridichi",
    "sfeclă roșie",
    "dovleac",
    "măsline",
    "măsline verzi",
    "capere",
    "inimă de anghinare",
    "murături",
    "kimchi",
    "varză murată",
  ],
  fruits: [
    "avocado",
    "lămâie",
    "lime",
    "portocală",
    "grepfrut",
    "măr",
    "pară",
    "ananas",
    "rodie",
    "mango",
    "banană",
    "căpșuni",
    "afine",
    "zmeură",
    "merișoare",
    "struguri",
    "piersică",
    "caise",
    "kiwi",
    "cireșe",
    "vișine",
    "curmale",
    "stafide",
    "smochine",
    "coacăze",
  ],
  herbsAndSpices: [
    "busuioc",
    "pătrunjel",
    "mărar",
    "coriandru",
    "mentă",
    "oregano",
    "cimbru",
    "rozmarin",
    "salvie",
    "tarhon",
    "boia dulce",
    "boia afumată",
    "curry",
    "chimion",
    "turmeric",
    "scorțișoară",
    "nucșoară",
    "anason",
    "cardamom",
    "cuișoare",
    "șofran",
    "fulgi de chilli",
    "fulgi de sare",
    "sumac",
    "za'atar",
    "piper cayenne",
    "garam masala",
    "condiment taco",
    "condiment cajun",
    "ierburi de Provence",
    "trufe",
  ],
  grainsAndPasta: [
    "orez",
    "orez jasmine",
    "orez basmati",
    "orez pentru sushi",
    "orez sălbatic",
    "paste",
    "spaghete",
    "penne",
    "fusilli",
    "rigatoni",
    "tagliatelle",
    "fettuccine",
    "linguine",
    "ravioli",
    "tortellini",
    "gnocchi",
    "lasagna",
    "cuscus",
    "bulgur",
    "quinoa",
    "orz",
    "ovăz",
    "tăiței de orez",
    "tăiței udon",
    "tăiței soba",
    "ramen",
  ],
  nutsAndSeeds: [
    "semințe de susan",
    "semințe de dovleac",
    "semințe de floarea-soarelui",
    "semințe de in",
    "semințe de chia",
    "migdale",
    "migdale feliate",
    "nuci",
    "alune",
    "fistic",
    "caju",
    "arahide",
    "unt de arahide",
    "unt de migdale",
  ],
  meats: [
    "pui",
    "piept de pui",
    "pulpă de pui",
    "aripioare de pui",
    "curcan",
    "piept de curcan",
    "vită",
    "antricot de vită",
    "mușchi de vită",
    "vrăbioară de vită",
    "rasol de vită",
    "carne tocată de vită",
    "pastramă de vită",
    "porc",
    "ceafă de porc",
    "cotlet de porc",
    "mușchiuleț de porc",
    "coaste de porc",
    "bacon",
    "prosciutto",
    "șuncă",
    "șuncă presată",
    "salam",
    "salam picant",
    "chorizo",
    "cârnați",
    "pepperoni",
    "pastramă",
    "rață",
    "piept de rață",
    "miel",
    "cotlet de miel",
    "kebab de pui",
    "kebab de vită",
    "shaorma de pui",
    "shaorma de vită",
  ],
  seafood: [
    "somon",
    "somon afumat",
    "ton",
    "ton roșu",
    "cod",
    "păstrăv",
    "doradă",
    "biban de mare",
    "sardine",
    "hamsii",
    "macrou",
    "hering",
    "caracatiță",
    "calamari",
    "creveți",
    "creveți black tiger",
    "midii",
    "scoici",
    "crab",
    "surimi",
    "homar",
    "langustine",
    "icre",
    "icre de somon",
    "alge wakame",
    "nori",
  ],
  preparedItems: [
    "hummus",
    "guacamole",
    "pesto",
    "pesto verde",
    "pesto roșu",
    "tapenade",
    "pastă de măsline",
    "pastă de ardei copți",
    "pastă de trufe",
    "dulceață de ceapă",
    "ceapă caramelizată",
    "castraveți murați feliați",
    "jalapeno murat",
    "ou poșat",
    "ou fiert",
    "ou ochi",
    "omletă",
    "piure de cartofi",
    "orez prăjit",
    "legume la grătar",
    "legume sotate",
    "crumble de biscuiți",
    "biscuiți Oreo",
    "bezea",
  ],
};
const INGREDIENT_CATALOG = [...new Set(Object.values(INGREDIENT_CATALOG_GROUPS).flat())];
const ALLERGEN_CATALOG = [
  "gluten",
  "grâu",
  "secară",
  "orz",
  "ovăz",
  "speltă",
  "crustacee",
  "ouă",
  "pește",
  "arahide",
  "soia",
  "lapte",
  "lactoză",
  "cazeină",
  "fructe cu coajă lemnoasă",
  "migdale",
  "alune de pădure",
  "nuci",
  "caju",
  "fistic",
  "nuci pecan",
  "nuci de Brazilia",
  "nuci macadamia",
  "țelină",
  "muștar",
  "semințe de susan",
  "susan",
  "dioxid de sulf",
  "sulfiți",
  "lupin",
  "moluște",
  "usturoi",
  "ceapă",
  "ciuperci",
  "porumb",
  "miere",
  "coriandru",
  "ardei iute",
  "piper",
  "ghimbir",
];
const MAX_INGREDIENT_SUGGESTIONS = 6;
const REQUESTED_DASHBOARD_VIEW = location.hash.replace("#", "");
const INITIAL_DASHBOARD_VIEW = NAV_ITEMS.some((item) => item.view === REQUESTED_DASHBOARD_VIEW)
  ? REQUESTED_DASHBOARD_VIEW
  : DEFAULT_DASHBOARD_VIEW;
if (REQUESTED_DASHBOARD_VIEW && REQUESTED_DASHBOARD_VIEW !== INITIAL_DASHBOARD_VIEW) {
  history.replaceState(null, "", `${location.pathname}${location.search}#${INITIAL_DASHBOARD_VIEW}`);
}

const state = {
  apiBase: DEFAULT_API_BASE,
  accessToken: localStorage.getItem("yumzyDashboardAccess") || "",
  refreshToken: localStorage.getItem("yumzyDashboardRefresh") || "",
  user: JSON.parse(localStorage.getItem("yumzyDashboardUser") || "null"),
  currentView: INITIAL_DASHBOARD_VIEW,
  restaurants: [],
  overview: [],
  productCategories: [],
  restaurantCategories: [],
  products: [],
  orders: [],
  availableCouriers: [],
  selectedRestaurantId: null,
  editingProductId: null,
  avatarPreviewUrls: {},
  loading: false,
  error: "",
  notice: "",
  confirmation: null,
  profileFormDirty: false,
  orderFilters: {
    status: "pending",
  },
  unseenOrderIds: [],
  hasLoadedOrdersOnce: false,
  audioAlertEnabled: false,
  googleAutocompleteStatus: GOOGLE_MAPS_API_KEY ? "idle" : "missing-key",
  googleAutocompleteMessage: GOOGLE_MAPS_API_KEY
    ? ""
    : "Autocomplete-ul pentru adresă este oprit: lipsește cheia Google Maps.",
};

const FLASH_MESSAGE_DURATION_MS = 4500;
const ORDER_POLL_INTERVAL_MS = 15000;
const ORDER_CLOCK_INTERVAL_MS = 30000;
const ORDER_ALERT_REPEAT_INTERVAL_MS = 4500;
let flashMessageTimer = null;
let pendingConfirmationAction = null;
let googleMapsPlacesApiPromise = null;
let orderPollingTimer = null;
let orderClockTimer = null;
let orderAlertTimer = null;
let ordersPollInFlight = false;
let alertAudioContext = null;
let audioUnlockBound = false;
let alertAudioElement = null;
let alertAudioUrl = "";
let alertAudioSpeechFallbackMuted = false;

const app = document.querySelector("#app");

function saveAuth(session) {
  state.accessToken = session.access;
  state.refreshToken = session.refresh;
  state.user = session.user;
  localStorage.setItem("yumzyDashboardAccess", session.access);
  localStorage.setItem("yumzyDashboardRefresh", session.refresh);
  localStorage.setItem("yumzyDashboardUser", JSON.stringify(session.user));
}

function clearAuth() {
  state.accessToken = "";
  state.refreshToken = "";
  state.user = null;
  localStorage.removeItem("yumzyDashboardAccess");
  localStorage.removeItem("yumzyDashboardRefresh");
  localStorage.removeItem("yumzyDashboardUser");
}

function setNotice(message) {
  state.notice = message;
  state.error = "";
  scheduleFlashMessageClear();
  render();
}

function setError(message) {
  state.error = message;
  state.notice = "";
  scheduleFlashMessageClear();
  render();
}

function clearFlashMessageTimer() {
  if (!flashMessageTimer) return;
  window.clearTimeout(flashMessageTimer);
  flashMessageTimer = null;
}

function scheduleFlashMessageClear() {
  clearFlashMessageTimer();
  if (!state.notice && !state.error) return;
  flashMessageTimer = window.setTimeout(() => {
    state.notice = "";
    state.error = "";
    flashMessageTimer = null;
    render();
  }, FLASH_MESSAGE_DURATION_MS);
}

function clearOrderRealtimeTimers() {
  if (orderPollingTimer) {
    window.clearInterval(orderPollingTimer);
    orderPollingTimer = null;
  }
  if (orderClockTimer) {
    window.clearInterval(orderClockTimer);
    orderClockTimer = null;
  }
  stopPendingOrderAlertLoop();
}

function syncOrderRealtime() {
  const shouldRun = Boolean(state.user && state.selectedRestaurantId);
  if (!shouldRun) {
    clearOrderRealtimeTimers();
    return;
  }

  if (!orderPollingTimer) {
    orderPollingTimer = window.setInterval(() => {
      pollOrdersInBackground();
    }, ORDER_POLL_INTERVAL_MS);
  }

  if (!orderClockTimer) {
    orderClockTimer = window.setInterval(() => {
      if (state.currentView === "orders" && !isEditingOrderForm()) render();
    }, ORDER_CLOCK_INTERVAL_MS);
  }
}

async function pollOrdersInBackground() {
  if (ordersPollInFlight || !state.user || !state.selectedRestaurantId) return;
  ordersPollInFlight = true;
  try {
    await Promise.all([reloadOrders({ shouldNotify: true }), reloadCouriers()]);
    if (state.currentView === "orders" && !isEditingOrderForm()) render();
  } catch {}
  ordersPollInFlight = false;
}

function isEditingOrderForm() {
  return Boolean(document.activeElement?.closest?.("[data-order-form]"));
}

function getAlertAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!alertAudioContext || alertAudioContext.state === "closed") {
    alertAudioContext = new AudioContextClass();
  }
  return alertAudioContext;
}

function createWavDataUrl(samples, sampleRate = 44100) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index));
      offset += 1;
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  samples.forEach((sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  });

  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getAlertAudioUrl() {
  if (alertAudioUrl) return alertAudioUrl;

  const sampleRate = 44100;
  const totalDurationSeconds = 2.2;
  const totalSamples = Math.floor(sampleRate * totalDurationSeconds);
  const samples = new Float32Array(totalSamples);
  const sirenBursts = [
    { start: 0.0, duration: 0.42, fromFrequency: 760, toFrequency: 1320, volume: 1.0 },
    { start: 0.54, duration: 0.42, fromFrequency: 1320, toFrequency: 760, volume: 1.0 },
    { start: 1.14, duration: 0.42, fromFrequency: 760, toFrequency: 1380, volume: 1.0 },
    { start: 1.68, duration: 0.42, fromFrequency: 1380, toFrequency: 820, volume: 1.0 },
  ];

  sirenBursts.forEach((burst) => {
    const startSample = Math.floor(burst.start * sampleRate);
    const endSample = Math.min(totalSamples, Math.floor((burst.start + burst.duration) * sampleRate));
    for (let index = startSample; index < endSample; index += 1) {
      const time = (index - startSample) / sampleRate;
      const progress = (index - startSample) / Math.max(1, endSample - startSample);
      const frequency = burst.fromFrequency + (burst.toFrequency - burst.fromFrequency) * progress;
      const envelope =
        Math.min(1, time / 0.01) *
        Math.min(1, (burst.duration - time) / 0.035) *
        (0.9 + 0.1 * Math.sin(2 * Math.PI * 7 * time));
      const tone =
        Math.sin(2 * Math.PI * frequency * time) * 0.52 +
        Math.sign(Math.sin(2 * Math.PI * frequency * time)) * 0.33 +
        Math.sin(2 * Math.PI * frequency * 0.5 * time) * 0.15;
      samples[index] += tone * envelope * burst.volume;
    }
  });

  alertAudioUrl = createWavDataUrl(samples, sampleRate);
  return alertAudioUrl;
}

function getAlertAudioElement() {
  if (!alertAudioElement) {
    alertAudioElement = new Audio(getAlertAudioUrl());
    alertAudioElement.preload = "auto";
  }
  return alertAudioElement;
}

function setAudioAlertEnabled(enabled) {
  if (state.audioAlertEnabled === enabled) return;
  state.audioAlertEnabled = enabled;
  if (state.user) render();
}

async function unlockAlertAudio() {
  const audioContext = getAlertAudioContext();
  if (!audioContext) return true;
  if (audioContext.state === "running") return true;

  try {
    await audioContext.resume();
    if (audioContext.state !== "running") return false;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.00001, audioContext.currentTime);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.01);
    return true;
  } catch {
    return false;
  }
}

async function primeAlertAudioElement() {
  try {
    const audioElement = getAlertAudioElement();
    audioElement.muted = true;
    audioElement.currentTime = 0;
    await audioElement.play();
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.muted = false;
    setAudioAlertEnabled(true);
    return true;
  } catch {
    const audioElement = getAlertAudioElement();
    audioElement.muted = false;
    audioElement.currentTime = 0;
    return false;
  }
}

async function ensureAlertAudioReady() {
  const unlocked = await unlockAlertAudio();
  const primed = await primeAlertAudioElement();
  const ready = Boolean(unlocked || primed);
  if (ready) setAudioAlertEnabled(true);
  return ready;
}

function hasPendingUnseenOrders() {
  return state.unseenOrderIds.some((id) => {
    const order = state.orders.find((item) => item.id === id);
    return order?.order_status === "pending";
  });
}

function stopPendingOrderAlertLoop() {
  if (!orderAlertTimer) return;
  window.clearInterval(orderAlertTimer);
  orderAlertTimer = null;
}

function syncPendingOrderAlertLoop() {
  const shouldRepeat = hasPendingUnseenOrders() && Boolean(state.user && state.selectedRestaurantId);
  if (!shouldRepeat) {
    stopPendingOrderAlertLoop();
    return;
  }
  if (orderAlertTimer) return;
  orderAlertTimer = window.setInterval(() => {
    if (!hasPendingUnseenOrders()) {
      stopPendingOrderAlertLoop();
      return;
    }
    playNewOrderAlert();
  }, ORDER_ALERT_REPEAT_INTERVAL_MS);
}

function bindAudioUnlock() {
  if (audioUnlockBound) return;
  audioUnlockBound = true;

  const unlockOnce = async () => {
    const ready = await ensureAlertAudioReady();
    if (!ready) return;

    ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
      window.removeEventListener(eventName, unlockOnce, true);
    });
  };

  ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, unlockOnce, true);
  });
}

async function playAlertAudioElement() {
  const audioElement = getAlertAudioElement();
  audioElement.pause();
  audioElement.currentTime = 0;
  audioElement.volume = 1;
  try {
    await audioElement.play();
    setAudioAlertEnabled(true);
    return true;
  } catch {
    return false;
  }
}

function playSpeechOrderFallback() {
  if (alertAudioSpeechFallbackMuted || typeof window.speechSynthesis === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") {
    return false;
  }
  try {
    const utterance = new SpeechSynthesisUtterance("Comandă nouă. Verifică dashboardul acum.");
    utterance.lang = "ro-RO";
    utterance.volume = 1;
    utterance.rate = 1.12;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

async function playNewOrderAlert() {
  try {
    let elementPlayed = await playAlertAudioElement();
    const audioContext = getAlertAudioContext();
    let webAudioPlayed = false;
    if (audioContext && audioContext.state !== "running") {
      const unlocked = await ensureAlertAudioReady();
      if (!unlocked) {
        if (!elementPlayed) {
          const speechPlayed = playSpeechOrderFallback();
          return speechPlayed;
        }
        return true;
      }
    }

    if (audioContext?.state === "running") {
      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(1, audioContext.currentTime);
      masterGain.connect(audioContext.destination);

      const sirenBursts = [
        { start: 0.0, duration: 0.42, fromFrequency: 760, toFrequency: 1320, type: "sawtooth", volume: 0.34 },
        { start: 0.54, duration: 0.42, fromFrequency: 1320, toFrequency: 760, type: "sawtooth", volume: 0.34 },
        { start: 1.14, duration: 0.42, fromFrequency: 760, toFrequency: 1380, type: "square", volume: 0.36 },
        { start: 1.68, duration: 0.42, fromFrequency: 1380, toFrequency: 820, type: "square", volume: 0.36 },
      ];

      sirenBursts.forEach((burst) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + burst.start;
        const peakAt = startAt + 0.02;
        const stopAt = startAt + burst.duration;

        oscillator.type = burst.type;
        oscillator.frequency.setValueAtTime(burst.fromFrequency, startAt);
        oscillator.frequency.exponentialRampToValueAtTime(burst.toFrequency, stopAt);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(burst.volume, peakAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(startAt);
        oscillator.stop(stopAt);
      });
      webAudioPlayed = true;
    }

    if (!elementPlayed) {
      elementPlayed = await playAlertAudioElement();
    }

    if (!elementPlayed && !webAudioPlayed) {
      return playSpeechOrderFallback();
    }

    return true;
  } catch {}
  return false;
}

function openConfirmation(options) {
  state.confirmation = {
    title: options.title || "Confirmă acțiunea",
    message: options.message || "",
    confirmLabel: options.confirmLabel || "Confirmă",
    confirmTone: options.confirmTone || "danger",
  };
  pendingConfirmationAction = typeof options.onConfirm === "function" ? options.onConfirm : null;
  render();
}

function closeConfirmation() {
  state.confirmation = null;
  pendingConfirmationAction = null;
  render();
}

async function handleConfirmationAccept() {
  const action = pendingConfirmationAction;
  state.confirmation = null;
  pendingConfirmationAction = null;
  render();
  if (!action) return;
  await action();
}

function setView(view) {
  state.currentView = view;
  location.hash = view;
  render();
}

function setSelectedRestaurant(restaurantId) {
  state.selectedRestaurantId = restaurantId ? Number(restaurantId) : null;
  state.hasLoadedOrdersOnce = false;
  state.unseenOrderIds = [];
  persistSelectedRestaurant();
  if (state.selectedRestaurantId && !state.currentView) {
    state.currentView = DEFAULT_DASHBOARD_VIEW;
  }
  fetchOwnerData();
}

function getSelectedRestaurant() {
  if (!state.selectedRestaurantId) return null;
  return state.restaurants.find((item) => item.id === state.selectedRestaurantId) || null;
}

function getOverviewRestaurant() {
  if (!state.selectedRestaurantId) return null;
  return state.overview.find((item) => item.id === state.selectedRestaurantId) || null;
}

function getRestaurantStorageKey() {
  return state.user ? `yumzyDashboardSelectedRestaurant:${state.user.id}` : "";
}

function hydrateSelectedRestaurant() {
  const storageKey = getRestaurantStorageKey();
  if (!storageKey) return;

  const storedValue = localStorage.getItem(storageKey);
  state.selectedRestaurantId = storedValue ? Number(storedValue) : null;
}

function persistSelectedRestaurant() {
  const storageKey = getRestaurantStorageKey();
  if (!storageKey) return;

  if (state.selectedRestaurantId) {
    localStorage.setItem(storageKey, String(state.selectedRestaurantId));
    return;
  }

  localStorage.removeItem(storageKey);
}

function syncSelectedRestaurant() {
  if (!state.restaurants.length) {
    state.selectedRestaurantId = null;
    state.hasLoadedOrdersOnce = false;
    state.unseenOrderIds = [];
    persistSelectedRestaurant();
    return;
  }

  const nextRestaurantId = state.restaurants[0].id;
  if (state.selectedRestaurantId !== nextRestaurantId) {
    state.hasLoadedOrdersOnce = false;
    state.unseenOrderIds = [];
  }
  state.selectedRestaurantId = nextRestaurantId;
  persistSelectedRestaurant();
}

function buildUrl(path, params) {
  const url = new URL(`${state.apiBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

function resolveMediaUrl(path) {
  if (!path) return "";

  const apiRoot = state.apiBase.replace(/\/api\/?$/, "");
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      if (url.hostname === "testserver") {
        return `${apiRoot}${url.pathname}${url.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }

  return `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeConfiguredApiBase(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (rawValue === "local") return "http://127.0.0.1:8000/api";
  if (rawValue === "prod" || rawValue === "production") return "https://api.yumzy.ro/api";

  try {
    const url = new URL(rawValue);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeConfiguredGoogleMapsApiKey(value) {
  return String(value || "").trim();
}

function getAddressAutocompleteHelpText(defaultText) {
  if (state.googleAutocompleteStatus === "ready") return defaultText;
  if (state.googleAutocompleteStatus === "missing-key") {
    return "Autocomplete-ul pentru adresă este oprit. Deschide dashboard-ul cu `&googleMapsApiKey=YOUR_KEY`.";
  }
  if (state.googleAutocompleteStatus === "load-error") {
    return state.googleAutocompleteMessage || "Google Places nu s-a încărcat. Verifică cheia și API-urile activate.";
  }
  return defaultText;
}

function appendCacheBust(url, value) {
  if (!url || !value || url.startsWith("data:")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(value)}`;
}

function normalizeImageText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getRestaurantAvatarFallbackUrl(restaurant) {
  const slug = normalizeImageText(restaurant.slug);
  const name = normalizeImageText(restaurant.name);
  const dashedName = name.replace(/\s+/g, "-");
  return (
    RESTAURANT_AVATAR_OVERRIDES[slug] ||
    RESTAURANT_AVATAR_NAME_OVERRIDES[name] ||
    RESTAURANT_AVATAR_OVERRIDES[dashedName] ||
    FALLBACK_RESTAURANT_AVATAR
  );
}

function resolveRestaurantAvatarUrl(restaurant) {
  if (restaurant.logo) return appendCacheBust(resolveMediaUrl(restaurant.logo), restaurant.updated_at);
  if (restaurant.cover_image) return appendCacheBust(resolveMediaUrl(restaurant.cover_image), restaurant.updated_at);
  return getRestaurantAvatarFallbackUrl(restaurant);
}

async function apiFetch(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (state.accessToken) {
    headers.set("Authorization", `Bearer ${state.accessToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.params), {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  if (response.status === 401 && retry && state.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch(path, options, false);
    }
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(extractError(payload));
  }
  return payload;
}

function extractError(payload) {
  if (!payload) return "A apărut o eroare neașteptată.";
  if (typeof payload === "string") return payload;
  if (payload.detail) return payload.detail;
  const flattenedMessages = flattenErrorMessages(payload);
  if (flattenedMessages.length) {
    return flattenedMessages.join(" ");
  }
  return "A apărut o eroare neașteptată.";
}

function flattenErrorMessages(payload, parentKey = "") {
  if (payload === null || payload === undefined) return [];
  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    return [parentKey ? `${parentKey}: ${payload}` : String(payload)];
  }
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorMessages(item, parentKey));
  }
  if (typeof payload === "object") {
    return Object.entries(payload).flatMap(([key, value]) =>
      flattenErrorMessages(value, parentKey || key === "non_field_errors" ? parentKey : key),
    );
  }
  return [];
}

async function refreshSession() {
  if (!state.refreshToken) return false;
  try {
    const session = await fetch(buildUrl("auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: state.refreshToken }),
    }).then((response) => response.json().then((payload) => ({ ok: response.ok, payload })));

    if (!session.ok || !session.payload.access) {
      clearAuth();
      return false;
    }

    state.accessToken = session.payload.access;
    if (session.payload.refresh) {
      state.refreshToken = session.payload.refresh;
      localStorage.setItem("yumzyDashboardRefresh", state.refreshToken);
    }
    localStorage.setItem("yumzyDashboardAccess", state.accessToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

async function bootstrap() {
  if (!state.accessToken) {
    render();
    return;
  }

  try {
    await fetchCurrentUser();
    await fetchOwnerData();
  } catch (error) {
    clearAuth();
    setError(error.message);
  }
}

async function fetchCurrentUser() {
  const user = await apiFetch("auth/me/");
  state.user = user;
  localStorage.setItem("yumzyDashboardUser", JSON.stringify(user));
  hydrateSelectedRestaurant();
  if (user.role !== "restaurant_owner" && user.role !== "admin") {
    throw new Error("Contul autentificat nu are acces de restaurant owner.");
  }
}

async function fetchOwnerData() {
  if (!state.user) return;
  state.loading = true;
  state.profileFormDirty = false;
  render();
  try {
    const [restaurants, overview, restaurantCategories] = await Promise.all([
      apiFetch("restaurant-owner/restaurants/"),
      apiFetch("restaurant-owner/restaurants/overview/"),
      apiFetch("restaurant-categories/"),
    ]);

    state.restaurants = restaurants.results || restaurants;
    state.overview = overview;
    state.restaurantCategories = restaurantCategories.results || restaurantCategories;
    syncSelectedRestaurant();

    if (state.selectedRestaurantId) {
      await Promise.all([reloadProducts(), reloadOrders({ shouldNotify: false }), reloadCategories(), reloadCouriers()]);
    } else {
      state.productCategories = [];
      state.products = [];
      state.orders = [];
      state.availableCouriers = [];
      state.hasLoadedOrdersOnce = false;
      state.unseenOrderIds = [];
    }

    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    setError(error.message);
  }
}

function selectedRestaurantParams() {
  return state.selectedRestaurantId ? { restaurant: state.selectedRestaurantId } : {};
}

async function reloadProducts() {
  const payload = await apiFetch("restaurant-owner/products/", { params: selectedRestaurantParams() });
  state.products = payload.results || payload;
}

async function reloadOrders(options = {}) {
  const { shouldNotify = false } = options;
  const payload = await apiFetch("restaurant-owner/orders/", { params: selectedRestaurantParams() });
  const nextOrders = payload.results || payload;
  const previousIds = new Set(state.orders.map((order) => order.id));
  const nextIds = new Set(nextOrders.map((order) => order.id));
  const newOrders = state.hasLoadedOrdersOnce ? nextOrders.filter((order) => !previousIds.has(order.id)) : [];

  state.orders = nextOrders;
  state.hasLoadedOrdersOnce = true;
  state.unseenOrderIds = [
    ...new Set([
      ...state.unseenOrderIds.filter((id) => nextIds.has(id)),
      ...newOrders.map((order) => order.id),
    ]),
  ].filter((id) => {
    const order = nextOrders.find((item) => item.id === id);
    return order && order.order_status === "pending";
  });
  syncPendingOrderAlertLoop();

  if (newOrders.length && shouldNotify) {
    playNewOrderAlert();
    const message = `${newOrders.length} comandă${newOrders.length > 1 ? "i noi au" : " nouă a"} intrat în dashboard.`;
    if (isEditingOrderForm()) {
      state.notice = message;
      state.error = "";
      scheduleFlashMessageClear();
    } else {
      setNotice(message);
    }
  }
}

async function reloadCouriers() {
  state.availableCouriers = await apiFetch("restaurant-owner/orders/couriers/");
}

async function reloadCategories() {
  const payload = await apiFetch("restaurant-owner/categories/", { params: selectedRestaurantParams() });
  state.productCategories = payload.results || payload;
}

function render() {
  app.innerHTML = `${state.user ? renderDashboard() : renderLogin()}${renderConfirmationDialog()}`;
  bindEvents();
  syncOrderRealtime();
}

function renderLogin() {
  return `
    <div class="login-shell">
      ${renderFlashMessage()}
      <div class="login-card">
        <section class="login-copy">
          <div>
            <h2 class="hero-title">Controlezi meniul, profilul și comenzile dintr-un singur loc.</h2>
            <p class="hero-lead">
              Dashboard-ul YUMZY este făcut pentru restaurante care vor să își actualizeze rapid produsele,
              clipurile video și informațiile publice.
            </p>
          </div>
        </section>

        <section class="login-panel">
          <div class="brand brand-large" aria-label="YUMZY">
            <span class="logo-word">YUMZ<span>Y</span></span>
            <span class="logo-line" aria-hidden="true"><i></i><b></b></span>
          </div>
          <h1>Conectare</h1>
          <p class="muted">Intră în contul restaurantului pentru a-ți administra prezența în aplicație.</p>
          <form class="login-form" id="login-form">
            <label class="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="owner@yumzy.ro" required />
            </label>
            <label class="field">
              <span>Parolă</span>
              <input name="password" type="password" placeholder="Parolă" required />
            </label>
            <div class="button-row">
              <button class="button" type="submit">Intră în dashboard</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const restaurant = getSelectedRestaurant();
  const overview = getOverviewRestaurant();
  const view = state.currentView || DEFAULT_DASHBOARD_VIEW;
  const subtitle = pageSubtitle(view, restaurant);
  const isInitialDashboardLoading = state.loading && !state.restaurants.length;
  const dashboardContent = isInitialDashboardLoading ? renderDashboardLoadingState() : restaurant ? renderView(view, restaurant, overview) : renderEmptyRestaurantState();

  return `
    <div class="dashboard-shell">
      ${renderFlashMessage()}
      <aside class="shell-sidebar">
        <div class="sidebar-brand">
          <a class="brand brand-large" href="../index.html" aria-label="YUMZY home">
            <span class="logo-word">YUMZ<span>Y</span></span>
            <span class="logo-line" aria-hidden="true"><i></i><b></b></span>
          </a>
        </div>
        <nav class="sidebar-nav">
          ${NAV_ITEMS.map((item) => renderNavButton(item, view)).join("")}
        </nav>
        <div class="sidebar-profile">
          <div class="avatar-mark">${escapeHtml(getInitials(restaurant?.name || state.user?.full_name || state.user?.email || "Y"))}</div>
          <div>
            <strong>${escapeHtml(restaurant?.name || state.user?.full_name || state.user?.email || "Owner")}</strong>
            <div class="muted">${escapeHtml(state.user?.email || "")}</div>
          </div>
        </div>
        <div class="sidebar-footer">
          <button class="ghost-button" id="logout-button" type="button">Logout</button>
        </div>
      </aside>

      <main class="shell-main">
        <div class="topbar">
          <div>
            <h1 class="page-title">${escapeHtml(pageTitle(view))}</h1>
            ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          <div class="top-actions">
            <button class="ghost-button ${state.audioAlertEnabled ? "is-audio-ready" : "is-audio-pending"}" id="audio-alert-button" type="button">
              <i class="${state.audioAlertEnabled ? "ri-volume-up-line" : "ri-volume-mute-line"}" aria-hidden="true"></i>
              ${state.audioAlertEnabled ? "Testează sunetul" : "Activează sunetul"}
            </button>
            ${state.loading && !isInitialDashboardLoading ? `<span class="status-chip">Se încarcă...</span>` : ""}
          </div>
        </div>
        ${dashboardContent}
      </main>
    </div>
  `;
}

function renderFlashMessage() {
  const type = state.error ? "error" : state.notice ? "success" : "";
  const message = state.error || state.notice;
  if (!type || !message) return "";

  const iconClass = type === "error" ? "ri-error-warning-fill" : "ri-checkbox-circle-fill";
  const title = type === "error" ? "A apărut o problemă" : "Acțiune finalizată";
  const liveRole = type === "error" ? "alert" : "status";

  return `
    <div class="flash-message-overlay" role="presentation">
      <div class="flash-message flash-message-${type}" role="${liveRole}" aria-live="polite" aria-atomic="true">
        <span class="flash-message-icon" aria-hidden="true"><i class="${iconClass}"></i></span>
        <div class="flash-message-copy">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(message)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmationDialog() {
  const confirmation = state.confirmation;
  if (!confirmation) return "";

  return `
    <div class="confirm-dialog-overlay" role="presentation">
      <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <div class="confirm-dialog-icon confirm-dialog-icon-${confirmation.confirmTone}" aria-hidden="true">
          <i class="${confirmation.confirmTone === "danger" ? "ri-delete-bin-5-fill" : "ri-error-warning-fill"}"></i>
        </div>
        <div class="confirm-dialog-copy">
          <h2 id="confirm-dialog-title">${escapeHtml(confirmation.title)}</h2>
          <p id="confirm-dialog-message">${escapeHtml(confirmation.message)}</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="ghost-button" type="button" data-confirm-cancel>Renunță</button>
          <button class="button confirm-dialog-button-${confirmation.confirmTone}" type="button" data-confirm-accept>${escapeHtml(confirmation.confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
}

function renderNavButton(item, currentView) {
  return `
    <button class="nav-button ${currentView === item.view ? "is-active" : ""}" data-view="${item.view}" type="button">
      <i class="${item.icon}" aria-hidden="true"></i>
      <span>${escapeHtml(item.label)}</span>
    </button>
  `;
}

function pageTitle(view) {
  return {
    overview: "Dashboard Restaurant",
    profile: "Profil Restaurant",
    products: "Produse & Video",
    orders: "Comenzi Live",
    account: "Cont",
  }[view] || "Dashboard Restaurant";
}

function pageSubtitle(view, restaurant) {
  const name = restaurant?.name || "restaurantul tău";
  return {
    overview: "",
    profile: `Date publice, contact și program pentru ${name}.`,
    products: `Actualizează produsele, prețurile și clipurile pentru ${name}.`,
    orders: `Monitorizează și actualizează starea comenzilor pentru ${name}.`,
    account: "Detalii despre sesiunea activă și contul owner.",
  }[view] || "";
}

function renderView(view, restaurant, overview) {
  switch (view) {
    case "profile":
      return renderProfileView(restaurant);
    case "products":
      return renderProductsView();
    case "orders":
      return renderOrdersView();
    case "account":
      return renderAccountView();
    case "overview":
    default:
      return renderOverviewView(restaurant, overview);
  }
}

function renderOverviewView(restaurant, overview) {
  return `
    <section class="overview-grid">
      <div class="panel">
        <div class="section-header">
          <div>
            <h2>Performanță restaurant</h2>
            <small>Fiecare indicator are propriul grafic, calculat din meniul și comenzile deja încărcate.</small>
          </div>
        </div>
        ${renderOverviewPerformanceChart(restaurant, overview)}
      </div>
    </section>
  `;
}

function renderMetricCard({ label, value, icon, note, detail, chart, accentClass = "" }) {
  return `
    <article class="metric-card metric-card-chart ${accentClass}">
      <span class="metric-icon"><i class="${icon}" aria-hidden="true"></i></span>
      <small>${label}</small>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(note)}</em>
      <div class="metric-chart-shell">
        ${chart}
      </div>
      <span class="metric-detail">${escapeHtml(detail)}</span>
    </article>
  `;
}

function renderOverviewPerformanceChart(restaurant, overview) {
  const activeProducts = Number(overview?.active_products_count || 0);
  const totalProducts = Number(overview?.products_count || 0);
  const inactiveProducts = Math.max(totalProducts - activeProducts, 0);
  const availabilityRate = totalProducts ? Math.round((activeProducts / totalProducts) * 100) : 0;
  const pendingOrders = Number(overview?.pending_orders_count || 0);
  const deliveredOrders = Number(overview?.delivered_orders_count || 0);
  const totalOrders = Number(overview?.orders_count || 0);
  const remainingOrders = Math.max(totalOrders - pendingOrders - deliveredOrders, 0);
  const grossRevenue = Number(overview?.gross_revenue || 0);
  const averageDeliveredOrderValue = deliveredOrders ? grossRevenue / deliveredOrders : 0;

  return `
    <div class="performance-chart-card">
      <div class="chart-metric-grid">
        ${renderMetricCard({
          label: "Produse",
          value: String(totalProducts),
          icon: "ri-restaurant-2-line",
          note: "Total articole în meniu",
          detail: `${activeProducts} active, ${inactiveProducts} indisponibile`,
          accentClass: "metric-accent-products",
          chart: renderSegmentChart([
            { label: "Active", value: activeProducts, toneClass: "tone-green" },
            { label: "Indisponibile", value: inactiveProducts, toneClass: "tone-amber" },
          ]),
        })}
        ${renderMetricCard({
          label: "Active",
          value: String(activeProducts),
          icon: "ri-checkbox-circle-line",
          note: "Disponibile în aplicație",
          detail: `${availabilityRate}% din meniu este public acum`,
          accentClass: "metric-accent-active",
          chart: renderProgressChart(availabilityRate, "Rată disponibilitate"),
        })}
        ${renderMetricCard({
          label: "Comenzi",
          value: String(totalOrders),
          icon: "ri-shopping-bag-3-line",
          note: `${pendingOrders} active acum`,
          detail: `${deliveredOrders} livrate, ${remainingOrders} în alt status`,
          accentClass: "metric-accent-orders",
          chart: renderMiniBarChart([
            { label: "Active", value: pendingOrders, toneClass: "tone-blue" },
            { label: "Livrate", value: deliveredOrders, toneClass: "tone-green" },
            { label: "Altele", value: remainingOrders, toneClass: "tone-slate" },
          ]),
        })}
        ${renderMetricCard({
          label: "Venit livrat",
          value: `${grossRevenue.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`,
          icon: "ri-bank-card-line",
          note: "Venit încasat",
          detail: deliveredOrders ? `Medie ${averageDeliveredOrderValue.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON / livrare` : "Nu există încă livrări finalizate",
          accentClass: "metric-accent-revenue",
          chart: renderSegmentChart([
            { label: "Livrate", value: deliveredOrders, toneClass: "tone-green" },
            { label: "Neîncasate", value: Math.max(totalOrders - deliveredOrders, 0), toneClass: "tone-slate" },
          ]),
        })}
      </div>
      <div class="pill-row">
        ${(overview?.categories_detail || []).map((item) => `<span class="pill">${escapeHtml(item.name)}</span>`).join("") || `<span class="pill is-muted">Adaugă categorii publice</span>`}
      </div>
    </div>
  `;
}

function renderSegmentChart(segments) {
  const total = segments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return `
    <div class="segment-chart" role="img" aria-label="${escapeHtml(segments.map((item) => `${item.label} ${item.value}`).join(", "))}">
      <div class="segment-chart-bar">
        ${segments
          .map((item) => {
            const width = total ? Math.max((Number(item.value || 0) / total) * 100, Number(item.value || 0) > 0 ? 6 : 0) : 0;
            return `<span class="segment-fill ${item.toneClass || ""}" style="width:${width}%"></span>`;
          })
          .join("")}
      </div>
      <div class="segment-chart-legend">
        ${segments
          .map(
            (item) => `
              <span><i class="segment-dot ${item.toneClass || ""}"></i>${escapeHtml(item.label)} ${escapeHtml(String(item.value || 0))}</span>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderProgressChart(percentage, label) {
  const safeValue = Math.max(0, Math.min(Number(percentage || 0), 100));
  return `
    <div class="progress-chart" role="img" aria-label="${escapeHtml(label)} ${safeValue}%">
      <div class="progress-chart-ring" style="--progress:${safeValue}%">
        <span>${safeValue}%</span>
      </div>
      <div class="progress-chart-bar">
        <span style="width:${safeValue}%"></span>
      </div>
    </div>
  `;
}

function renderMiniBarChart(items) {
  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return `
    <div class="mini-bar-chart" role="img" aria-label="${escapeHtml(items.map((item) => `${item.label} ${item.value}`).join(", "))}">
      <div class="mini-bar-chart-bars">
        ${items
          .map((item) => {
            const height = Math.max((Number(item.value || 0) / maxValue) * 100, Number(item.value || 0) > 0 ? 16 : 6);
            return `
              <span class="mini-bar-column">
                <i class="mini-bar-fill ${item.toneClass || ""}" style="height:${height}%"></i>
              </span>
            `;
          })
          .join("")}
      </div>
      <div class="mini-bar-chart-labels">
        ${items.map((item) => `<span>${escapeHtml(item.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderProfileView(restaurant) {
  const profileCompletion = getProfileCompletionState(restaurant);
  const completionPercent = profileCompletion.percent;
  const deliveryRange = `${restaurant.estimated_delivery_time_min || 25}-${restaurant.estimated_delivery_time_max || 45} min`;
  const pickupOnly = Boolean(restaurant.supports_pickup) && Number(restaurant.delivery_fee || 0) === 0;
  const identityDetailsLocked = restaurant.identity_details_locked !== false;
  const avatarUrl = state.avatarPreviewUrls[restaurant.id] || resolveRestaurantAvatarUrl(restaurant);
  const fallbackAvatarUrl = getRestaurantAvatarFallbackUrl(restaurant);

  return `
    <section class="profile-hero panel">
      <div class="profile-logo-hero">
        <div class="profile-logo-preview">
          <span class="profile-logo-initials">${escapeHtml(getInitials(restaurant.name || "Y"))}</span>
          <img
            src="${escapeHtml(avatarUrl)}"
            data-fallback-src="${escapeHtml(fallbackAvatarUrl)}"
            alt=""
            aria-label="Avatar ${escapeHtml(restaurant.name || "restaurant")}"
          />
        </div>
        <form class="profile-avatar-upload" data-media-form="logo">
          <label class="profile-avatar-action" aria-label="Actualizează logo-ul restaurantului">
            <i class="ri-add-line" aria-hidden="true"></i>
            <input type="file" name="logo" accept="image/*" data-auto-submit-media required />
          </label>
        </form>
      </div>
      <div class="profile-hero-copy">
        <div>
          <h2>${escapeHtml(restaurant.name || "Restaurant fără nume")}</h2>
          <p>${escapeHtml(restaurant.description || "Adaugă o descriere scurtă, clară și orientată spre client.")}</p>
        </div>
        <div class="profile-quick-facts">
          <span><i class="ri-map-pin-line" aria-hidden="true"></i>${escapeHtml(restaurant.city || "Oraș lipsă")}</span>
          <span><i class="ri-timer-line" aria-hidden="true"></i>${escapeHtml(deliveryRange)}</span>
          <span><i class="ri-price-tag-3-line" aria-hidden="true"></i>${Number(restaurant.minimum_order || 0).toLocaleString("ro-RO", { maximumFractionDigits: 2 })} RON minim</span>
        </div>
      </div>
      <aside class="profile-health-card">
        <small>Completare profil</small>
        <strong>${completionPercent}%</strong>
        <div class="profile-health-bar" aria-hidden="true"><span style="width:${completionPercent}%"></span></div>
      </aside>
    </section>

    <div class="profile-layout">
      <form id="profile-form" class="profile-form-stack">
        <section class="panel profile-form-card">
          <div class="form-section-title">
            <strong>Informații esențiale</strong>
            <span>${
              identityDetailsLocked
                ? `Numele și orașul definesc identitatea locației și pot fi modificate doar prin ${SUPPORT_EMAIL}. Adresa rămâne editabilă pentru test, iar descrierea poate fi actualizată oricând.`
                : `Numele și orașul pot fi completate o singură dată. După salvare, modificările se fac doar prin ${SUPPORT_EMAIL}.`
            }</span>
          </div>
          <div class="profile-card-fields">
            <div class="profile-locked-note">
              <i class="${identityDetailsLocked ? "ri-lock-line" : "ri-map-pin-user-line"}" aria-hidden="true"></i>
              <span>${
                identityDetailsLocked
                  ? `Pentru schimbări de nume sau oraș, scrie la <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Adresa este lăsată editabilă temporar pentru test.`
                  : "Completează atent aceste câmpuri. După prima salvare, ele se blochează."
              }</span>
            </div>
            <div class="split">
              <label class="field ${identityDetailsLocked ? "field-locked" : ""}">
                <span>Nume restaurant</span>
                <input name="name" value="${escapeHtml(restaurant.name || "")}" ${identityDetailsLocked ? 'readonly aria-readonly="true"' : 'placeholder="Ex: Yumzy Kitchen" required'} />
                <small>${
                  identityDetailsLocked
                    ? "Blocat pentru a păstra consistența brandului și a profilului public."
                    : "Poate fi setat o singură dată pentru profilul public."
                }</small>
              </label>
              <label class="field ${identityDetailsLocked ? "field-locked" : ""}">
                <span>Oraș</span>
                <select name="city" ${identityDetailsLocked ? 'disabled aria-disabled="true"' : 'required data-city-select'}>
                  ${renderRomaniaCityOptions(restaurant.city || "")}
                </select>
                <small>${
                  identityDetailsLocked
                    ? "Schimbarea orașului afectează aria de operare și logistica."
                    : "Selectează orașul corect; după prima salvare nu mai poate fi schimbat din dashboard."
                }</small>
              </label>
            </div>
            <label class="field">
              <span>Adresă</span>
              <input
                name="address"
                value="${escapeHtml(restaurant.address || "")}"
                required
                autocomplete="street-address"
                data-google-address-input
                placeholder="Începe să scrii adresa locației"
              />
              <small>${getAddressAutocompleteHelpText("Folosește adresa sugerată de Google pentru o localizare corectă.")}</small>
            </label>
            <input type="hidden" name="latitude" value="${escapeHtml(restaurant.latitude || "")}" />
            <input type="hidden" name="longitude" value="${escapeHtml(restaurant.longitude || "")}" />
            <label class="field"><span>Descriere</span><textarea name="description" placeholder="Descrie specificul, preparatele populare și motivul pentru care clientul ar comanda.">${escapeHtml(restaurant.description || "")}</textarea></label>
          </div>
        </section>

        <section class="panel profile-form-card">
          <div class="form-section-title">
            <strong>Contact și linkuri</strong>
            <span>Datele publice trebuie să fie ușor de verificat și de modificat.</span>
          </div>
          <div class="profile-card-fields">
            <div class="split">
              <label class="field"><span>Email public</span><input type="email" name="email" value="${escapeHtml(restaurant.email || "")}" placeholder="contact@restaurant.ro" /></label>
              <label class="field"><span>Telefon</span><input name="phone" value="${escapeHtml(restaurant.phone || "")}" placeholder="+40..." inputmode="tel" pattern="[0-9+()]*" data-phone-input /></label>
            </div>
            <div class="split">
              <label class="field"><span>Website</span><input type="url" name="website_url" value="${escapeHtml(restaurant.website_url || "")}" placeholder="https://..." /></label>
              <label class="field"><span>Video promo</span><input type="url" name="promo_video_url" value="${escapeHtml(restaurant.promo_video_url || "")}" placeholder="https://..." /></label>
            </div>
            <div class="split">
              <label class="field"><span>Instagram</span><input type="url" name="instagram_url" value="${escapeHtml(restaurant.instagram_url || "")}" placeholder="https://instagram.com/..." /></label>
              <label class="field"><span>TikTok</span><input type="url" name="tiktok_url" value="${escapeHtml(restaurant.tiktok_url || "")}" placeholder="https://tiktok.com/..." /></label>
            </div>
          </div>
        </section>

        <section class="panel profile-form-card">
          <div class="form-section-title">
            <strong>Setări operaționale</strong>
            <span>Controlează cum apare restaurantul și ce poate face clientul.</span>
          </div>
          <div class="profile-card-fields">
            <div class="ops-metric-grid">
              <label class="field ops-metric-card">
                <span>Taxă livrare</span>
                <input type="number" step="0.01" min="0" max="${MAX_DELIVERY_FEE}" name="delivery_fee" value="${restaurant.delivery_fee || 0}" ${pickupOnly ? "disabled" : ""} data-delivery-fee />
                <small>Setează costul standard pentru livrare, între 0 și ${MAX_DELIVERY_FEE} RON.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Comandă minimă</span>
                <input type="number" step="0.01" min="0" max="${MAX_MINIMUM_ORDER}" name="minimum_order" value="${restaurant.minimum_order || 0}" />
                <small>Pragul minim pentru plasarea comenzii, între 0 și ${MAX_MINIMUM_ORDER} RON.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Timp livrare minim</span>
                <input type="number" min="${MIN_DELIVERY_TIME_MINUTES}" max="${MAX_DELIVERY_TIME_MINUTES}" name="estimated_delivery_time_min" value="${restaurant.estimated_delivery_time_min || 25}" />
                <small>Estimarea optimistă afișată în aplicație, între ${MIN_DELIVERY_TIME_MINUTES} și ${MAX_DELIVERY_TIME_MINUTES} minute.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Timp livrare maxim</span>
                <input type="number" min="${MIN_DELIVERY_TIME_MINUTES}" max="${MAX_DELIVERY_TIME_MINUTES}" name="estimated_delivery_time_max" value="${restaurant.estimated_delivery_time_max || 45}" />
                <small>Estimarea conservatoare pentru client, între ${MIN_DELIVERY_TIME_MINUTES} și ${MAX_DELIVERY_TIME_MINUTES} minute.</small>
              </label>
            </div>
            <div class="check-card-grid profile-toggle-grid ops-toggle-grid">
              <label class="checkbox-field ops-toggle-card">
                <input type="checkbox" name="pickup_only" ${pickupOnly ? "checked" : ""} data-pickup-only />
                <span>
                  <strong>Doar colectare</strong>
                  <small>Restaurantul acceptă doar ridicare din locație și nu percepe taxă de livrare.</small>
                </span>
              </label>
              <label class="checkbox-field ops-toggle-card">
                <input type="checkbox" name="supports_pickup" ${restaurant.supports_pickup ? "checked" : ""} ${pickupOnly ? "disabled" : ""} data-supports-pickup />
                <span>
                  <strong>Permite pickup</strong>
                  <small>Clientul poate ridica și comenzi plasate prin aplicație.</small>
                </span>
              </label>
              <label class="checkbox-field ops-toggle-card">
                <input type="checkbox" name="is_open" ${restaurant.is_open ? "checked" : ""} />
                <span>
                  <strong>Restaurant deschis</strong>
                  <small>Activează disponibilitatea imediată pentru comenzi noi.</small>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section class="panel profile-form-card">
          <div class="form-section-title">
            <strong>Program</strong>
            <span>Setează orele pe zile. Bifează „Închis” ca să dezactivezi rapid intervalul.</span>
          </div>
          <div class="hours-grid">
            ${renderHoursRows(restaurant.opening_hours || [])}
          </div>
        </section>

        ${renderRestaurantPublishPanel(restaurant)}

      </form>
    </div>
  `;
}

function renderRestaurantPublishPanel(restaurant) {
  if (state.profileFormDirty) {
    return `
      <section class="profile-publish-panel">
        <button class="publish-restaurant-button" type="submit" form="profile-form" ${state.loading ? "disabled" : ""}>
          <i class="ri-save-3-line" aria-hidden="true"></i>
          <span>Salveaza editarile</span>
        </button>
      </section>
    `;
  }

  if (restaurant.is_active) {
    return `
      <section class="profile-publish-panel is-live">
        <div class="restaurant-live-state">
          <i class="ri-checkbox-circle-line" aria-hidden="true"></i>
          <span>Restaurant <strong class="restaurant-live-word">Live</strong> in aplicatie</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="profile-publish-panel">
      <button class="publish-restaurant-button" type="button" data-publish-restaurant ${state.loading ? "disabled" : ""}>
        <i class="ri-rocket-line" aria-hidden="true"></i>
        <span>Adauga restaurantul in aplicatie</span>
      </button>
    </section>
  `;
}

function getProfileCompletionState(restaurant) {
  const checks = [
    Boolean(restaurant.name && restaurant.city && restaurant.address),
    Boolean(restaurant.email || restaurant.phone),
    Boolean((restaurant.description || "").trim()),
    Boolean(restaurant.logo),
    hasCompleteOpeningHours(restaurant.opening_hours || []),
  ];
  const completedItems = checks.filter(Boolean).length;
  return {
    isComplete: completedItems === checks.length,
    percent: Math.round((completedItems / checks.length) * 100),
  };
}

function renderRomaniaCityOptions(selectedCity) {
  const normalizedSelectedCity = (selectedCity || "").trim();
  const cityOptions = Array.isArray(window.ROMANIA_CITY_OPTIONS) ? window.ROMANIA_CITY_OPTIONS : [];
  const hasSelectedOption = cityOptions.some((option) => option.value === normalizedSelectedCity);
  const customSelectedOption =
    normalizedSelectedCity && !hasSelectedOption
      ? `<option value="${escapeHtml(normalizedSelectedCity)}" selected>${escapeHtml(normalizedSelectedCity)}</option>`
      : "";

  return `
    <option value="" ${normalizedSelectedCity ? "" : "selected"} disabled>Alege orașul</option>
    ${customSelectedOption}
    ${cityOptions
      .map(
        (option) => `
          <option value="${escapeHtml(option.value)}" ${option.value === normalizedSelectedCity ? "selected" : ""}>
            ${escapeHtml(option.label)}
          </option>
        `,
      )
      .join("")}
  `;
}

function hasCompleteOpeningHours(hours) {
  return DAY_LABELS.every((_, index) => {
    const entry = hours.find((item) => item.day_of_week === index);
    if (!entry) return false;
    if (entry.is_closed) return true;
    return Boolean(entry.opening_time && entry.closing_time);
  });
}

function renderHoursRows(hours) {
  return DAY_LABELS.map((dayLabel, index) => {
    const entry = hours.find((item) => item.day_of_week === index) || {};
    return `
      <div class="hour-row">
        <div class="hour-day">
          <strong>${dayLabel}</strong>
          ${entry.is_closed ? "<small>Închis</small>" : ""}
        </div>
        <div class="hour-time-group">
          <label class="hour-time-field">
            <span>Deschide</span>
            <input type="time" name="opening_time_${index}" value="${(entry.opening_time || "").slice(0, 5)}" ${entry.is_closed ? "disabled" : ""} />
          </label>
          <span class="hour-time-separator" aria-hidden="true">—</span>
          <label class="hour-time-field">
            <span>Închide</span>
            <input type="time" name="closing_time_${index}" value="${(entry.closing_time || "").slice(0, 5)}" ${entry.is_closed ? "disabled" : ""} />
          </label>
        </div>
        <label class="checkbox-field hour-closed-toggle">
          <input type="checkbox" name="is_closed_${index}" ${entry.is_closed ? "checked" : ""} />
          <span>Închis</span>
        </label>
      </div>
    `;
  }).join("");
}

function renderProductsView() {
  return `
    <section class="panel product-workbench">
      <div class="section-header">
        <div>
          <h2>${state.editingProductId ? "Editează produs" : "Produs nou"}</h2>
          <small>Completează informațiile esențiale și adaugă video-ul produsului.</small>
        </div>
      </div>
      <form id="product-form" class="form-grid">
        <div class="form-section">
          <div class="form-section-title">
            <strong>Informații de bază</strong>
            <span>Nume, tip de produs, descriere și preț.</span>
          </div>
          <div class="form-section-fields">
            <div class="split">
              <label class="field"><span>Nume produs</span><input name="name" placeholder="Ex: Smash burger cu cheddar" required /></label>
              <label class="field">
                <span>Tip Produs</span>
                <select name="product_type" required>
                  <option value="">Alege tipul de produs</option>
                  ${PRODUCT_TYPE_OPTIONS.map((item) => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join("")}
                </select>
              </label>
            </div>
            <label class="field"><span>Descriere scurtă</span><textarea name="description" placeholder="Ce îl face bun? Ingrediente, stil, recomandare."></textarea></label>
            <div class="split">
              <label class="field"><span>Preț</span><input type="number" step="0.01" name="price" required /></label>
              <label class="field"><span>Preț promo</span><input type="number" step="0.01" name="discount_price" /></label>
            </div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">
            <strong>Detalii utile</strong>
            <span>Ajută clientul să aleagă mai repede.</span>
          </div>
          <div class="form-section-fields">
            <div class="split">
              <label class="field"><span>Timp preparare (minute)</span><input type="number" name="preparation_time" value="15" /></label>
              <label class="field"><span>Calorii</span><input type="number" name="calories" /></label>
            </div>
            <div class="field ingredient-builder">
              <span>Ingrediente</span>
              <div class="ingredient-builder-header">
                <small>Adaugă ingredientele pe rând. Poți seta și prețul adăugat pentru fiecare +20g.</small>
                <button class="ghost-button ingredient-add-button" type="button" data-add-ingredient>
                  <i class="ri-add-line" aria-hidden="true"></i> Adaugă ingredient
                </button>
              </div>
              <div class="ingredient-rows" data-ingredient-rows>
                ${renderIngredientRows([EMPTY_INGREDIENT_ROW])}
              </div>
            </div>
            <div class="field allergen-builder">
              <span>Alergeni</span>
              <div class="ingredient-builder-header">
                <small>Adaugă alergenii pe rând și selectează forma recomandată din listă.</small>
                <button class="ghost-button ingredient-add-button" type="button" data-add-allergen>
                  <i class="ri-add-line" aria-hidden="true"></i> Adaugă alergen
                </button>
              </div>
              <div class="allergen-rows" data-allergen-rows>
                ${renderAllergenRows([""])}
              </div>
            </div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">
            <strong>Media produs</strong>
            <span>Video-ul este elementul principal în experiența YUMZY.</span>
          </div>
          <div class="form-section-fields">
            <label class="field"><span>Video produs</span><input type="file" name="video_file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" /></label>
            <label class="field"><span>Video URL</span><input type="url" name="video_url" placeholder="https://..." /></label>
          </div>
        </div>
        <div class="button-row">
          <button class="button" type="submit">${state.editingProductId ? "Salvează produsul" : "Adaugă produs"}</button>
          ${state.editingProductId ? `<button class="ghost-button" type="button" id="cancel-product-edit">Renunță</button>` : ""}
        </div>
      </form>
    </section>
    <div class="section-header video-list-header">
      <div>
        <h2>Produse existente</h2>
        <small>Produsele fără video rămân vizibile aici ca să le poți edita sau șterge.</small>
      </div>
      <span class="status-chip pending">${state.products.length} produse</span>
    </div>
    <section class="products-grid">
      ${state.products.length
        ? state.products
            .map(
              (product) => `
                <article class="product-card">
                  ${renderProductMedia(product)}
                  <div class="section-header">
                    <div>
                      <h3>${escapeHtml(product.name)}</h3>
                      <small>${escapeHtml(product.product_type_label || product.category_name || "Fără tip")}</small>
                    </div>
                  </div>
                  <div class="price-line">
                    ${product.discount_price ? `<span class="original-price">${product.price} RON</span>` : `${product.price} RON`}
                    ${product.discount_price ? `<small class="promo-price">promo ${product.discount_price} RON</small>` : ""}
                  </div>
                  <p>${escapeHtml(product.description || "Fără descriere.")}</p>
                  <div class="button-row">
                    <button class="outline-button" type="button" data-edit-product="${product.id}">Editează</button>
                    <button class="ghost-button" type="button" data-delete-product="${product.id}">Șterge</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : `<article class="empty-card"><h3>Niciun produs</h3><small>Adaugă un produs nou pentru restaurantul curent.</small></article>`}
    </section>
  `;
}

function renderProductMedia(product) {
  if (product.video_url) {
    return `
      <div class="product-media">
        <video src="${resolveMediaUrl(product.video_url)}" ${product.image ? `poster="${resolveMediaUrl(product.image)}"` : ""} controls muted playsinline preload="auto" data-video-preview></video>
      </div>
    `;
  }

  if (product.image) {
    return `
      <div class="product-media">
        <img src="${resolveMediaUrl(product.image)}" alt="${escapeHtml(product.name)}" />
        ${product.video_url ? `<a class="play-badge" href="${product.video_url}" target="_blank" rel="noreferrer"><i class="ri-play-fill" aria-hidden="true"></i> Video</a>` : `<span class="play-badge is-muted"><i class="ri-video-off-line" aria-hidden="true"></i> Fără video</span>`}
      </div>
    `;
  }

  return `
    <div class="product-media is-empty">
      <i class="ri-image-add-line" aria-hidden="true"></i>
      <span>Adaugă imagine</span>
      ${product.video_url ? `<a class="play-badge" href="${product.video_url}" target="_blank" rel="noreferrer"><i class="ri-play-fill" aria-hidden="true"></i> Video</a>` : ""}
    </div>
  `;
}

function renderOrdersView() {
  const visibleOrders = getVisibleOrders();
  return `
    <section class="orders-toolbar">
      ${ORDER_FILTER_STATUS_OPTIONS.map((option) => {
        const count = state.orders.filter((order) => order.order_status === option.value).length;
        return `
          <button
            class="order-filter-button ${state.orderFilters.status === option.value ? "is-active" : ""}"
            type="button"
            data-order-status-filter="${option.value}"
          >
            <span>${escapeHtml(option.label)}</span>
            <strong>${count}</strong>
          </button>
        `;
      }).join("")}
    </section>
    <section class="orders-grid">
      ${visibleOrders.length
        ? visibleOrders
            .map(
              (order) => `
                <article class="order-card ${isPendingPriorityOrder(order) ? "is-pending-priority" : ""} ${state.unseenOrderIds.includes(order.id) ? "is-unseen" : ""}">
                  <div class="order-card-shell">
                    <div class="order-card-primary">
                      <div class="order-list-header">
                        <div class="order-list-title">
                          <h3>Comanda #${order.id}</h3>
                          <small>${escapeHtml(order.customer_name || order.customer_email || "")}</small>
                        </div>
                        <div class="order-list-header-meta">
                          <span class="status-chip ${order.order_status}">${escapeHtml(ORDER_STATUS_LABELS[order.order_status] || order.order_status)}</span>
                          <strong class="order-list-total">${escapeHtml(formatMoney(order.total))}</strong>
                        </div>
                      </div>
                      <div class="order-sla-bar">
                        <strong>${escapeHtml(formatElapsedSince(order.created_at))}</strong>
                        <span class="order-sla-chip ${getOrderSlaInfo(order).tone}">${escapeHtml(getOrderSlaInfo(order).label)}</span>
                      </div>
                      <div class="order-inline-facts">
                        <span><i class="ri-time-line" aria-hidden="true"></i>${escapeHtml(formatOrderDate(order.created_at))}</span>
                        <span><i class="ri-bike-line" aria-hidden="true"></i>${escapeHtml(formatFulfillmentTypeLabel(order))}</span>
                        <span><i class="ri-bank-card-line" aria-hidden="true"></i>${escapeHtml(formatPaymentMethodLabel(order))} / ${escapeHtml(formatPaymentStatusLabel(order))}</span>
                        <span><i class="ri-timer-line" aria-hidden="true"></i>${escapeHtml(formatDeliveryWindow(order.estimated_delivery_window_minutes))}</span>
                        ${order.estimated_distance_km != null ? `<span><i class="ri-route-line" aria-hidden="true"></i>${escapeHtml(formatDistanceKm(order.estimated_distance_km))}</span>` : ""}
                        ${order.estimated_arrival_minutes != null ? `<span><i class="ri-navigation-line" aria-hidden="true"></i>${escapeHtml(`Ajunge în ${order.estimated_arrival_minutes} min`)}</span>` : ""}
                      </div>
                      <div class="order-contact-stack">
                        ${order.customer_phone ? `<div class="order-contact-line"><i class="ri-phone-line" aria-hidden="true"></i><span>${escapeHtml(order.customer_phone)}</span></div>` : ""}
                        ${order.customer_email ? `<div class="order-contact-line"><i class="ri-mail-line" aria-hidden="true"></i><span>${escapeHtml(order.customer_email)}</span></div>` : ""}
                        ${
                          order.fulfillment_type === "delivery" && order.address_summary
                            ? `<div class="order-contact-line"><i class="ri-map-pin-line" aria-hidden="true"></i><span>${escapeHtml(order.address_summary)}</span></div>`
                            : `<div class="order-contact-line"><i class="ri-store-2-line" aria-hidden="true"></i><span>Ridicare din restaurant</span></div>`
                        }
                        ${order.address_details?.instructions ? `<div class="order-contact-line"><i class="ri-information-line" aria-hidden="true"></i><span>${escapeHtml(order.address_details.instructions)}</span></div>` : ""}
                      </div>
                      <div class="order-items-list">
                        ${(order.items || [])
                          .map(
                            (item) => `
                              <div class="order-item-row">
                                <div class="order-item-main">
                                  <div class="order-item-name">${escapeHtml(item.product_name)}</div>
                                  ${
                                    item.options?.length
                                      ? `<div class="order-item-detail">${escapeHtml(
                                          item.options.map((option) => `${option.option_name}${Number(option.extra_price || 0) > 0 ? ` (+${formatMoney(option.extra_price)})` : ""}`).join(", "),
                                        )}</div>`
                                      : ""
                                  }
                                  ${item.notes ? `<div class="order-item-detail">${escapeHtml(item.notes)}</div>` : ""}
                                </div>
                                <div class="order-item-meta">
                                  <span class="order-item-qty">${item.quantity}x</span>
                                  <strong>${escapeHtml(formatMoney(item.total_price))}</strong>
                                </div>
                              </div>
                            `,
                          )
                          .join("")}
                      </div>
                      <div class="order-totals order-totals-compact">
                        <div><span><i class="ri-receipt-line" aria-hidden="true"></i>Subtotal</span><strong>${escapeHtml(formatMoney(order.subtotal))}</strong></div>
                        <div><span><i class="ri-bike-line" aria-hidden="true"></i>Livrare</span><strong>${escapeHtml(formatMoney(order.delivery_fee))}</strong></div>
                        <div><span><i class="ri-price-tag-3-line" aria-hidden="true"></i>Discount</span><strong>${escapeHtml(formatMoney(order.discount))}</strong></div>
                        <div><span><i class="ri-wallet-3-line" aria-hidden="true"></i>Total</span><strong>${escapeHtml(formatMoney(order.total))}</strong></div>
                      </div>
                      ${
                        order.customer_note
                          ? `<div class="order-detail-panel">
                              <div class="order-detail-title"><i class="ri-chat-1-line" aria-hidden="true"></i> Nota clientului</div>
                              <div class="order-detail-body">
                                ${formatCustomerNote(order.customer_note)}
                              </div>
                            </div>`
                          : ""
                      }
                    </div>
                    <div class="order-card-sidebar">
                      <div class="order-actions">
                        ${order.customer_phone ? `<a class="ghost-button" href="tel:${escapeHtml(order.customer_phone)}"><i class="ri-phone-fill" aria-hidden="true"></i> Sună clientul</a>` : ""}
                        ${order.address_summary ? `<button class="ghost-button" type="button" data-copy-address="${order.id}"><i class="ri-file-copy-line" aria-hidden="true"></i> Copiază adresa</button>` : ""}
                    ${order.address_summary ? `<a class="ghost-button" href="${escapeHtml(buildOrderMapUrl(order))}" target="_blank" rel="noreferrer"><i class="ri-map-pin-2-line" aria-hidden="true"></i> Deschide harta</a>` : ""}
                      </div>
                      <form class="toolbar order-toolbar" data-order-form="${order.id}">
                        <div class="order-toolbar-panel">
                          <label class="order-toolbar-field">
                            <span><i class="ri-flag-line" aria-hidden="true"></i>Status comandă</span>
                            <select name="order_status">
                              ${OWNER_STATUS_OPTIONS.map((status) => `<option value="${status}" ${status === order.order_status ? "selected" : ""}>${ORDER_STATUS_LABELS[status]}</option>`).join("")}
                            </select>
                          </label>
                          ${
                            order.fulfillment_type === "delivery"
                              ? `<label class="order-toolbar-field">
                                  <span><i class="ri-user-star-line" aria-hidden="true"></i>Curier</span>
                                  <select name="courier_id">
                                    <option value="">${order.courier_id ? "Fără reasignare" : "Asignează curier"}</option>
                                    ${state.availableCouriers.map((courier) => `<option value="${courier.courier_id}" ${Number(courier.courier_id) === Number(order.courier) ? "selected" : ""}>${escapeHtml(`${courier.full_name} · ${formatVehicleTypeLabel(courier.vehicle_type)}${courier.is_available ? "" : " · indisponibil"}`)}</option>`).join("")}
                                  </select>
                                </label>`
                              : ""
                          }
                          <label class="order-toolbar-field">
                            <span><i class="ri-sticky-note-line" aria-hidden="true"></i>Notă internă</span>
                            <input name="restaurant_note" value="${escapeHtml(order.restaurant_note || "")}" placeholder="Adaugă context pentru echipă" />
                          </label>
                        </div>
                        <button class="button order-toolbar-submit" type="submit"><i class="ri-save-line" aria-hidden="true"></i>Actualizează</button>
                      </form>
                      <div class="order-timeline">
                        <div class="order-detail-title"><i class="ri-history-line" aria-hidden="true"></i> Istoric operațional</div>
                        <div class="order-timeline-list">
                          ${(order.events || [])
                            .slice(0, 6)
                            .map(
                              (event) => `
                                <div class="order-timeline-item">
                                  <strong>${escapeHtml(formatOrderEventLabel(event))}</strong>
                                  <span>${escapeHtml(formatOrderEventMeta(event))}</span>
                                </div>
                              `,
                            )
                            .join("") || `<div class="order-timeline-item"><strong>Fără istoric încă</strong><span>Evenimentele noi vor apărea aici.</span></div>`}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              `,
            )
            .join("")
        : `<article class="empty-card empty-orders-card">
            <div class="empty-orders-icon" aria-hidden="true"><i class="ri-inbox-archive-line"></i></div>
            <h3>Nicio comandă în acest status</h3>
          </article>`}
    </section>
  `;
}

function renderAccountView() {
  const restaurant = getSelectedRestaurant();
  const user = state.user || {};
  const userName = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Owner";
  const joinedAt = formatAccountDate(user.date_joined);
  const lastLogin = formatAccountDate(user.last_login);
  const accountStatus = getAccountStatusMeta(user);
  const verificationStatus = getVerificationStatusMeta(user);
  const avatarUrl = restaurant ? state.avatarPreviewUrls[restaurant.id] || resolveRestaurantAvatarUrl(restaurant) : "";
  const fallbackAvatarUrl = restaurant ? getRestaurantAvatarFallbackUrl(restaurant) : "";
  const avatarLabel = restaurant?.name || userName || user.email || "Owner";

  return `
    <section class="account-layout">
      <article class="panel account-hero-card">
        <div class="account-hero-copy">
          <div class="account-avatar">
            ${
              restaurant
                ? `
                  <img
                    src="${escapeHtml(avatarUrl)}"
                    data-fallback-src="${escapeHtml(fallbackAvatarUrl)}"
                    alt=""
                    aria-label="Avatar ${escapeHtml(avatarLabel)}"
                  />
                `
                : `${escapeHtml(getInitials(userName || user.email || "Owner"))}`
            }
          </div>
          <div>
            <p class="eyebrow">Cont owner</p>
            <h2>${escapeHtml(userName)}</h2>
            <p class="account-hero-lead">Datele de profil, starea contului și detaliile sesiunii active sunt centralizate aici.</p>
          </div>
        </div>
      </article>
      <article class="panel">
        <div class="section-header">
          <div>
            <h2>Profil cont</h2>
            <small>Informații de identificare și asocierea cu restaurantul din dashboard.</small>
          </div>
        </div>
        <div class="account-grid account-grid-rich">
          ${renderAccountItem("Nume owner", userName)}
          ${renderAccountItem("Email", user.email || "-")}
          ${renderAccountItem("Telefon", user.phone || "-")}
          ${renderAccountItem("Rol", formatUserRole(user.role || ""))}
          ${renderAccountItem("Restaurant asociat", restaurant?.name || "Neasociat încă")}
          ${renderAccountItem("Oraș restaurant", restaurant?.city || "-")}
          ${renderAccountItem("Creat la", joinedAt)}
          ${renderAccountItem("Ultima autentificare", lastLogin)}
        </div>
      </article>
      <article class="panel">
        <div class="section-header">
          <div>
            <h2>Securitate și sesiune</h2>
            <small>Starea contului și acțiuni rapide pentru acces și parolă.</small>
          </div>
        </div>
        <div class="account-grid account-grid-rich">
          ${renderAccountItem("Status cont", accountStatus.label, accountStatus.helper)}
          ${renderAccountItem("Status email", verificationStatus.label, verificationStatus.helper)}
          ${renderAccountItem("Dispozitiv curent", getCurrentDeviceLabel())}
          ${renderAccountItem("Browser", getCurrentBrowserLabel())}
          ${renderAccountItem("Restaurant selectat", restaurant?.name || "-")}
          ${renderAccountItem("Asistență", SUPPORT_EMAIL)}
        </div>
        <div class="button-row account-action-row">
          <button class="ghost-button" id="account-password-reset-button" type="button">
            <i class="ri-lock-password-line" aria-hidden="true"></i>
            Trimite email resetare parolă
          </button>
          ${
            user.is_active
              ? ""
              : `<button class="ghost-button" id="account-resend-verification-button" type="button">
                  <i class="ri-mail-send-line" aria-hidden="true"></i>
                  Retrimite verificarea emailului
                </button>`
          }
          <a class="ghost-button" href="mailto:${escapeHtml(SUPPORT_EMAIL)}">
            <i class="ri-customer-service-2-line" aria-hidden="true"></i>
            Contact suport
          </a>
        </div>
      </article>
    </section>
  `;
}

function renderEmptyRestaurantState() {
  return `
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>Creează primul restaurant</h2>
          <small>Onboarding rapid pentru conturile noi de owner.</small>
        </div>
      </div>
      <form id="create-restaurant-form" class="form-grid">
        <div class="profile-locked-note">
          <i class="ri-edit-box-line" aria-hidden="true"></i>
          <span>Identitatea restaurantului se completează o singură dată. După creare, schimbările de nume, oraș sau adresă se fac doar prin <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</span>
        </div>
        <div class="split">
          <label class="field"><span>Nume restaurant</span><input name="name" required /></label>
          <label class="field">
            <span>Oraș</span>
            <select name="city" required data-city-select>
              ${renderRomaniaCityOptions("")}
            </select>
          </label>
        </div>
        <label class="field">
          <span>Adresă</span>
          <input name="address" required autocomplete="street-address" data-google-address-input placeholder="Începe să scrii adresa locației" />
          <small>${getAddressAutocompleteHelpText("Alege adresa din sugestiile Google pentru o localizare corectă.")}</small>
        </label>
        <input type="hidden" name="latitude" value="" />
        <input type="hidden" name="longitude" value="" />
        <div class="split">
          <label class="field"><span>Email public</span><input type="email" name="email" /></label>
          <label class="field"><span>Telefon</span><input name="phone" inputmode="tel" pattern="[0-9+()]*" data-phone-input /></label>
        </div>
        <label class="field"><span>Descriere</span><textarea name="description" placeholder="Spune pe scurt ce face restaurantul special."></textarea></label>
        <div class="split">
          <label class="field"><span>Delivery fee</span><input type="number" step="0.01" name="delivery_fee" value="0" /></label>
          <label class="field"><span>Comandă minimă</span><input type="number" step="0.01" name="minimum_order" value="0" /></label>
        </div>
        <div class="button-row">
          <button class="button" type="submit">Creează restaurantul</button>
        </div>
      </form>
    </section>
  `;
}

function renderDashboardLoadingState() {
  return `
    <section class="dashboard-loading-shell" aria-label="Se încarcă">
      <div class="dashboard-loading-indicator" aria-hidden="true"></div>
    </section>
  `;
}

function bindEvents() {
  bindAudioUnlock();
  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#logout-button")?.addEventListener("click", handleLogout);
  document.querySelector("#audio-alert-button")?.addEventListener("click", handleAudioAlertButton);
  document.querySelector("#account-password-reset-button")?.addEventListener("click", handlePasswordResetRequest);
  document.querySelector("#account-resend-verification-button")?.addEventListener("click", handleVerificationResend);
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelector("#profile-form")?.addEventListener("submit", handleProfileSubmit);
  document.querySelector("[data-publish-restaurant]")?.addEventListener("click", handlePublishRestaurant);
  document.querySelectorAll("[data-media-form]").forEach((form) => form.addEventListener("submit", handleMediaSubmit));
  document.querySelectorAll("[data-auto-submit-media]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.files?.[0]) input.form?.requestSubmit();
    });
  });
  bindProfileDirtyState();
  bindPhoneInputs();
  bindOperationalControls();
  bindFallbackImages();
  bindVideoPreviews();

  document.querySelector("#product-form")?.addEventListener("submit", handleProductSubmit);
  document.querySelector("#cancel-product-edit")?.addEventListener("click", resetProductEditing);
  document.querySelector("[data-add-ingredient]")?.addEventListener("click", () => appendIngredientRow());
  document.querySelector("[data-ingredient-rows]")?.addEventListener("click", (event) => {
    const suggestionButton = event.target.closest("[data-ingredient-suggestion]");
    if (suggestionButton) {
      const row = suggestionButton.closest("[data-ingredient-row]");
      const input = row?.querySelector('[name="ingredient_name"]');
      if (input) {
        input.value = suggestionButton.dataset.ingredientSuggestion || "";
        closeIngredientSuggestions(row);
      }
      return;
    }
    const button = event.target.closest("[data-remove-ingredient]");
    if (!button) return;
    removeIngredientRow(button.closest("[data-ingredient-row]"));
  });
  document.querySelector("[data-add-allergen]")?.addEventListener("click", () => appendAllergenRow());
  document.querySelector("[data-allergen-rows]")?.addEventListener("click", (event) => {
    const suggestionButton = event.target.closest("[data-allergen-suggestion]");
    if (suggestionButton) {
      const row = suggestionButton.closest("[data-allergen-row]");
      const input = row?.querySelector('[name="allergen_name"]');
      if (input) {
        input.value = suggestionButton.dataset.allergenSuggestion || "";
        closeAllergenSuggestions(row);
      }
      return;
    }
    const button = event.target.closest("[data-remove-allergen]");
    if (!button) return;
    removeAllergenRow(button.closest("[data-allergen-row]"));
  });
  document.querySelector("[data-ingredient-rows]")?.addEventListener("input", (event) => {
    const input = event.target.closest('[name="ingredient_name"]');
    if (!input) return;
    renderIngredientSuggestions(input);
  });
  document.querySelector("[data-allergen-rows]")?.addEventListener("input", (event) => {
    const input = event.target.closest('[name="allergen_name"]');
    if (!input) return;
    renderAllergenSuggestions(input);
  });
  document.querySelector("[data-ingredient-rows]")?.addEventListener("focusin", (event) => {
    const input = event.target.closest('[name="ingredient_name"]');
    if (!input) return;
    renderIngredientSuggestions(input);
  });
  document.querySelector("[data-allergen-rows]")?.addEventListener("focusin", (event) => {
    const input = event.target.closest('[name="allergen_name"]');
    if (!input) return;
    renderAllergenSuggestions(input);
  });
  document.querySelector("[data-ingredient-rows]")?.addEventListener("focusout", (event) => {
    const input = event.target.closest('[name="ingredient_name"]');
    if (!input) return;
    window.setTimeout(() => {
      canonicalizeIngredientInput(input);
      closeIngredientSuggestions(input.closest("[data-ingredient-row]"));
    }, 120);
  });
  document.querySelector("[data-allergen-rows]")?.addEventListener("focusout", (event) => {
    const input = event.target.closest('[name="allergen_name"]');
    if (!input) return;
    window.setTimeout(() => {
      canonicalizeAllergenInput(input);
      closeAllergenSuggestions(input.closest("[data-allergen-row]"));
    }, 120);
  });
  document.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => startProductEdit(Number(button.dataset.editProduct)));
  });
  document.querySelectorAll("[data-delete-product]").forEach((button) => {
    button.addEventListener("click", () => requestProductDeletion(Number(button.dataset.deleteProduct)));
  });
  document.querySelector("[data-confirm-cancel]")?.addEventListener("click", closeConfirmation);
  document.querySelector("[data-confirm-accept]")?.addEventListener("click", handleConfirmationAccept);

  document.querySelectorAll("[data-order-form]").forEach((form) => {
    form.addEventListener("submit", handleOrderUpdate);
  });
  document.querySelectorAll("[data-order-status-filter]").forEach((button) => {
    button.addEventListener("click", handleOrderStatusFilterChange);
  });
  document.querySelectorAll("[data-copy-address]").forEach((button) => {
    button.addEventListener("click", handleCopyOrderAddress);
  });

  document.querySelector("#create-restaurant-form")?.addEventListener("submit", handleCreateRestaurant);
  bindHoursToggles();
  hydrateEditingForms();
  bindGoogleAddressAutocomplete();
}

function bindProfileDirtyState() {
  const form = document.querySelector("#profile-form");
  const restaurant = getSelectedRestaurant();
  if (!form || !restaurant) return;

  const identityDetailsLocked = restaurant.identity_details_locked !== false;
  const computeDirty = () => {
    const current = new FormData(form);
    const valuesDiffer = (left, right) => String(left ?? "").trim() !== String(right ?? "").trim();
    const pickupOnly = current.get("pickup_only") === "on";
    const savedPickupOnly = Boolean(restaurant.supports_pickup) && Number(restaurant.delivery_fee || 0) === 0;
    const dirty =
      (!identityDetailsLocked &&
        (valuesDiffer(current.get("name"), restaurant.name) || valuesDiffer(current.get("city"), restaurant.city))) ||
      valuesDiffer(current.get("address"), restaurant.address) ||
      valuesDiffer(current.get("description"), restaurant.description) ||
      valuesDiffer(current.get("email"), restaurant.email) ||
      valuesDiffer(current.get("phone"), restaurant.phone) ||
      valuesDiffer(current.get("website_url"), restaurant.website_url) ||
      valuesDiffer(current.get("promo_video_url"), restaurant.promo_video_url) ||
      valuesDiffer(current.get("instagram_url"), restaurant.instagram_url) ||
      valuesDiffer(current.get("tiktok_url"), restaurant.tiktok_url) ||
      valuesDiffer(current.get("delivery_fee"), restaurant.delivery_fee ?? 0) ||
      valuesDiffer(current.get("minimum_order"), restaurant.minimum_order ?? 0) ||
      valuesDiffer(current.get("estimated_delivery_time_min"), restaurant.estimated_delivery_time_min ?? 25) ||
      valuesDiffer(current.get("estimated_delivery_time_max"), restaurant.estimated_delivery_time_max ?? 45) ||
      (current.get("supports_pickup") === "on") !== Boolean(restaurant.supports_pickup) ||
      pickupOnly !== savedPickupOnly ||
      (current.get("is_open") === "on") !== Boolean(restaurant.is_open) ||
      DAY_LABELS.some((_, index) => {
        const entry = (restaurant.opening_hours || []).find((item) => Number(item.day_of_week) === index) || {};
        return (
          (current.get(`is_closed_${index}`) === "on") !== Boolean(entry.is_closed) ||
          (current.get(`opening_time_${index}`) || "") !== String(entry.opening_time || "").slice(0, 5) ||
          (current.get(`closing_time_${index}`) || "") !== String(entry.closing_time || "").slice(0, 5)
        );
      });

    if (dirty !== state.profileFormDirty) {
      state.profileFormDirty = dirty;
      syncProfilePublishPanel(restaurant);
    }
  };

  form.addEventListener("input", computeDirty);
  form.addEventListener("change", computeDirty);
  syncProfilePublishPanel(restaurant);
}

function syncProfilePublishPanel(restaurant) {
  const currentPanel = document.querySelector(".profile-publish-panel");
  if (!currentPanel || !restaurant) return;

  const template = document.createElement("template");
  template.innerHTML = renderRestaurantPublishPanel(restaurant).trim();
  const nextPanel = template.content.firstElementChild;
  if (!nextPanel) return;

  currentPanel.replaceWith(nextPanel);
  nextPanel.querySelector("[data-publish-restaurant]")?.addEventListener("click", handlePublishRestaurant);
}

function bindHoursToggles() {
  DAY_LABELS.forEach((_, index) => {
    const checkbox = document.querySelector(`[name="is_closed_${index}"]`);
    const open = document.querySelector(`[name="opening_time_${index}"]`);
    const close = document.querySelector(`[name="closing_time_${index}"]`);
    checkbox?.addEventListener("change", () => {
      const disabled = checkbox.checked;
      if (open) open.disabled = disabled;
      if (close) close.disabled = disabled;
    });
  });
}

function bindPhoneInputs() {
  document.querySelectorAll("[data-phone-input]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = (input.value || "").replace(/[^0-9+()]/g, "");
    });
  });
}

function ensureSelectHasOption(select, value) {
  if (!select || !value) return;
  const normalizedValue = String(value).trim();
  if (!normalizedValue) return;
  if (Array.from(select.options).some((option) => option.value === normalizedValue)) return;
  const option = document.createElement("option");
  option.value = normalizedValue;
  option.textContent = normalizedValue;
  select.append(option);
}

function readGoogleAddressComponent(place, acceptedTypes) {
  const components = Array.isArray(place?.address_components) ? place.address_components : [];
  const component = components.find((entry) => entry.types?.some((type) => acceptedTypes.includes(type)));
  return component?.long_name || "";
}

function inferCityFromPlace(place) {
  return (
    readGoogleAddressComponent(place, ["locality"]) ||
    readGoogleAddressComponent(place, ["postal_town"]) ||
    readGoogleAddressComponent(place, ["administrative_area_level_2"]) ||
    readGoogleAddressComponent(place, ["administrative_area_level_1"])
  );
}

function formatCoordinate(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  return numericValue.toFixed(6);
}

function loadGoogleMapsPlacesApi() {
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (!GOOGLE_MAPS_API_KEY) return Promise.resolve(null);
  if (googleMapsPlacesApiPromise) return googleMapsPlacesApiPromise;

  googleMapsPlacesApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsPlaces = "true";
    script.addEventListener("load", () => {
      if (window.google?.maps?.places) {
        resolve(window.google.maps);
        return;
      }
      reject(new Error("Google Maps Places API nu a fost încărcat."));
    });
    script.addEventListener("error", () => reject(new Error("Google Maps Places API nu a putut fi încărcat.")));
    document.head.append(script);
  }).catch((error) => {
    googleMapsPlacesApiPromise = null;
    throw error;
  });

  return googleMapsPlacesApiPromise;
}

function bindGoogleAddressAutocomplete() {
  const addressInputs = Array.from(document.querySelectorAll("[data-google-address-input]"));
  if (!addressInputs.length) return;
  if (!GOOGLE_MAPS_API_KEY) {
    if (state.googleAutocompleteStatus !== "missing-key") {
      state.googleAutocompleteStatus = "missing-key";
      state.googleAutocompleteMessage = "Autocomplete-ul pentru adresă este oprit: lipsește cheia Google Maps.";
      render();
    }
    return;
  }

  loadGoogleMapsPlacesApi()
    .then(() => {
      if (state.googleAutocompleteStatus !== "ready") {
        state.googleAutocompleteStatus = "ready";
        state.googleAutocompleteMessage = "";
        render();
        return;
      }
      addressInputs.forEach((input) => {
        if (input.dataset.googleAutocompleteBound === "true") return;
        input.dataset.googleAutocompleteBound = "true";

        const form = input.closest("form");
        const citySelect = form?.querySelector("[data-city-select]");
        const latitudeInput = form?.querySelector('[name="latitude"]');
        const longitudeInput = form?.querySelector('[name="longitude"]');
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          fields: ["formatted_address", "address_components", "geometry"],
          types: ["address"],
          componentRestrictions: { country: "ro" },
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place) return;

          if (place.formatted_address) {
            input.value = place.formatted_address;
          }

          const city = inferCityFromPlace(place);
          if (citySelect && city) {
            ensureSelectHasOption(citySelect, city);
            citySelect.value = city;
          }

          const latitude = place.geometry?.location?.lat?.();
          const longitude = place.geometry?.location?.lng?.();
          if (latitudeInput && Number.isFinite(latitude)) latitudeInput.value = formatCoordinate(latitude);
          if (longitudeInput && Number.isFinite(longitude)) longitudeInput.value = formatCoordinate(longitude);
        });
      });
    })
    .catch((error) => {
      if (state.googleAutocompleteStatus !== "load-error" || state.googleAutocompleteMessage !== error.message) {
        state.googleAutocompleteStatus = "load-error";
        state.googleAutocompleteMessage = error.message;
        render();
      }
      console.warn(error.message);
    });
}

function bindOperationalControls() {
  const pickupOnly = document.querySelector("[data-pickup-only]");
  const supportsPickup = document.querySelector("[data-supports-pickup]");
  const deliveryFee = document.querySelector("[data-delivery-fee]");
  if (!pickupOnly || !supportsPickup || !deliveryFee) return;

  const syncOperationalControls = () => {
    const isPickupOnly = pickupOnly.checked;
    supportsPickup.checked = isPickupOnly || supportsPickup.checked;
    supportsPickup.disabled = isPickupOnly;
    deliveryFee.disabled = isPickupOnly;
    if (isPickupOnly) deliveryFee.value = "0";
  };

  pickupOnly.addEventListener("change", syncOperationalControls);
  syncOperationalControls();
}

function bindFallbackImages() {
  document.querySelectorAll("img[data-fallback-src]").forEach((image) => {
    image.addEventListener("error", () => {
      const fallbackSrc = image.dataset.fallbackSrc;
      if (fallbackSrc && image.src !== fallbackSrc && image.dataset.fallbackApplied !== "true") {
        image.dataset.fallbackApplied = "true";
        image.src = fallbackSrc;
        return;
      }
      image.classList.add("is-hidden");
    });
  });
}

function bindVideoPreviews() {
  document.querySelectorAll("video[data-video-preview]").forEach((video) => {
    const revealPreview = () => {
      video.classList.add("has-preview");
      if (video.readyState >= 2) return;
      try {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
      } catch {}
    };
    video.addEventListener("loadedmetadata", revealPreview, { once: true });
    video.addEventListener("loadeddata", () => video.classList.add("has-preview"), { once: true });
    video.load();
  });
}

function hydrateEditingForms() {
  const form = document.querySelector("#product-form");
  if (!form) return;

  if (state.editingProductId) {
    const product = state.products.find((item) => item.id === state.editingProductId);
    if (product) {
      getField(form, "name").value = product.name || "";
      getField(form, "product_type").value = product.product_type || "other";
      getField(form, "description").value = product.description || "";
      getField(form, "price").value = product.price || "";
      getField(form, "discount_price").value = product.discount_price || "";
      getField(form, "preparation_time").value = product.preparation_time || 15;
      getField(form, "calories").value = product.calories || "";
      setIngredientRows(parseIngredientRows(product.ingredient_details || product.ingredients));
      setAllergenRows(parseAllergenRows(product.allergens));
      getField(form, "video_url").value = product.video_url || "";
      getField(form, "video_file").value = "";
      return;
    }
  }

  setIngredientRows([EMPTY_INGREDIENT_ROW]);
  setAllergenRows([""]);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const session = await apiFetch("auth/login/", {
      method: "POST",
      body: {
        email: form.get("email"),
        password: form.get("password"),
      },
    });
    saveAuth(session);
    await fetchCurrentUser();
    await fetchOwnerData();
    setNotice("Autentificare reușită.");
  } catch (error) {
    setError(error.message);
  }
}

async function handleLogout() {
  try {
    if (state.refreshToken) {
      await apiFetch("auth/logout/", {
        method: "POST",
        body: { refresh: state.refreshToken },
      });
    }
  } catch {}

  clearAuth();
  state.restaurants = [];
  state.overview = [];
  state.productCategories = [];
  state.restaurantCategories = [];
  state.products = [];
  state.orders = [];
  state.selectedRestaurantId = null;
  state.editingProductId = null;
  Object.values(state.avatarPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
  state.avatarPreviewUrls = {};
  setNotice("Sesiunea a fost închisă.");
}

async function handlePasswordResetRequest() {
  if (!state.user?.email) {
    setError("Lipsește emailul contului pentru resetarea parolei.");
    return;
  }

  try {
    await apiFetch("auth/password-reset/", {
      method: "POST",
      body: { email: state.user.email },
    });
    setNotice("Am trimis instrucțiunile pentru resetarea parolei pe email.");
  } catch (error) {
    setError(error.message);
  }
}

async function handleAudioAlertButton() {
  const ready = await ensureAlertAudioReady();
  const played = await playNewOrderAlert();
  if (ready && played) {
    setNotice("Sunetul pentru comenzi este activ.");
    return;
  }
  setError("Browserul a blocat alerta audio. Lasă dashboard-ul în prim-plan și apasă din nou pe «Activează sunetul».");
}

async function handleVerificationResend() {
  if (!state.user?.email) {
    setError("Lipsește emailul contului pentru retrimiterea verificării.");
    return;
  }

  try {
    await apiFetch("auth/verify-email/resend/", {
      method: "POST",
      body: { email: state.user.email },
    });
    setNotice("Am retrimis emailul de confirmare.");
  } catch (error) {
    setError(error.message);
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = new FormData(event.currentTarget);
  const identityDetailsLocked = restaurant.identity_details_locked !== false;
  const pickupOnly = form.get("pickup_only") === "on";
  const deliveryFee = pickupOnly ? 0 : Number(form.get("delivery_fee") || 0);
  const minimumOrder = Number(form.get("minimum_order") || 0);
  const estimatedDeliveryTimeMin = Number(form.get("estimated_delivery_time_min") || 25);
  const estimatedDeliveryTimeMax = Number(form.get("estimated_delivery_time_max") || 45);
  const payload = {
    email: form.get("email"),
    phone: form.get("phone"),
    description: form.get("description"),
    website_url: form.get("website_url"),
    promo_video_url: form.get("promo_video_url"),
    instagram_url: form.get("instagram_url"),
    tiktok_url: form.get("tiktok_url"),
    delivery_fee: pickupOnly ? "0" : String(deliveryFee),
    minimum_order: String(minimumOrder),
    estimated_delivery_time_min: estimatedDeliveryTimeMin,
    estimated_delivery_time_max: estimatedDeliveryTimeMax,
    supports_pickup: pickupOnly || form.get("supports_pickup") === "on",
    is_open: form.get("is_open") === "on",
  };

  if (!identityDetailsLocked) {
    payload.name = String(form.get("name") || "").trim();
    payload.city = String(form.get("city") || "").trim();
    if (!payload.name || !payload.city) {
      setError("Completează numele și orașul înainte de prima salvare.");
      return;
    }
  }
  payload.address = String(form.get("address") || "").trim();
  const latitude = String(form.get("latitude") || "").trim();
  const longitude = String(form.get("longitude") || "").trim();
  if (!payload.address) {
    setError("Completează adresa restaurantului.");
    return;
  }
  payload.latitude = latitude || null;
  payload.longitude = longitude || null;

  if (Number.isNaN(deliveryFee) || deliveryFee < 0 || deliveryFee > MAX_DELIVERY_FEE) {
    setError(`Taxa de livrare trebuie să fie între 0 și ${MAX_DELIVERY_FEE} RON.`);
    return;
  }
  if (Number.isNaN(minimumOrder) || minimumOrder < 0 || minimumOrder > MAX_MINIMUM_ORDER) {
    setError(`Comanda minimă trebuie să fie între 0 și ${MAX_MINIMUM_ORDER} RON.`);
    return;
  }
  if (
    Number.isNaN(estimatedDeliveryTimeMin) ||
    estimatedDeliveryTimeMin < MIN_DELIVERY_TIME_MINUTES ||
    estimatedDeliveryTimeMin > MAX_DELIVERY_TIME_MINUTES
  ) {
    setError(
      `Timpul minim de livrare trebuie să fie între ${MIN_DELIVERY_TIME_MINUTES} și ${MAX_DELIVERY_TIME_MINUTES} minute.`,
    );
    return;
  }
  if (
    Number.isNaN(estimatedDeliveryTimeMax) ||
    estimatedDeliveryTimeMax < MIN_DELIVERY_TIME_MINUTES ||
    estimatedDeliveryTimeMax > MAX_DELIVERY_TIME_MINUTES
  ) {
    setError(
      `Timpul maxim de livrare trebuie să fie între ${MIN_DELIVERY_TIME_MINUTES} și ${MAX_DELIVERY_TIME_MINUTES} minute.`,
    );
    return;
  }
  if (estimatedDeliveryTimeMin > estimatedDeliveryTimeMax) {
    setError("Timpul maxim de livrare trebuie să fie mai mare sau egal cu timpul minim.");
    return;
  }

  const openingHours = DAY_LABELS.map((_, index) => {
    const openingValue = String(form.get(`opening_time_${index}`) || "").trim();
    const closingValue = String(form.get(`closing_time_${index}`) || "").trim();
    const explicitlyClosed = form.get(`is_closed_${index}`) === "on";
    const hasAnyHour = Boolean(openingValue || closingValue);

    if (!explicitlyClosed && (openingValue || closingValue) && !(openingValue && closingValue)) {
      throw new Error(`Completează ambele ore pentru ${DAY_LABELS[index]} sau marchează ziua ca închisă.`);
    }

    const isClosed = explicitlyClosed || !hasAnyHour;
    return {
      day_of_week: index,
      opening_time: isClosed ? null : normalizeTime(openingValue),
      closing_time: isClosed ? null : normalizeTime(closingValue),
      is_closed: isClosed,
    };
  });

  try {
    const updated = await apiFetch(`restaurant-owner/restaurants/${restaurant.id}/`, {
      method: "PATCH",
      body: {
        ...payload,
        opening_hours: openingHours,
      },
    });
    replaceRestaurant(updated);
    await fetchOwnerData();
    setNotice("Profilul restaurantului a fost salvat.");
  } catch (error) {
    setError(error.message);
  }
}

async function handlePublishRestaurant(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;

  state.loading = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const updated = await apiFetch(`restaurant-owner/restaurants/${restaurant.id}/`, {
      method: "PATCH",
      body: { is_active: true },
    });
    replaceRestaurant(updated);
    await fetchOwnerData();
    setNotice("Restaurant Live in aplicatie");
  } catch (error) {
    state.loading = false;
    setError(error.message);
  }
}

async function handleMediaSubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = event.currentTarget;
  const fieldName = form.dataset.mediaForm;
  const input = form.querySelector(`input[name="${fieldName}"]`);
  if (!input?.files?.[0]) {
    setError("Selectează mai întâi o imagine.");
    return;
  }

  const payload = new FormData();
  const selectedFile = input.files[0];
  payload.append(fieldName, selectedFile);

  try {
    if (fieldName === "logo") {
      if (state.avatarPreviewUrls[restaurant.id]) URL.revokeObjectURL(state.avatarPreviewUrls[restaurant.id]);
      state.avatarPreviewUrls[restaurant.id] = URL.createObjectURL(selectedFile);
    }
    state.loading = true;
    state.error = "";
    state.notice = "";
    render();

    const updated = await apiFetch(`restaurant-owner/restaurants/${restaurant.id}/`, {
      method: "PATCH",
      body: payload,
      headers: {},
    });
    replaceRestaurant(updated);
    await fetchOwnerData();
    if (input) input.value = "";
    setNotice("Imaginea a fost actualizată.");
  } catch (error) {
    state.loading = false;
    setError(error.message);
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = event.currentTarget;
  const formData = new FormData();
  formData.append("restaurant_id", restaurant.id);
  appendIfValue(formData, "product_type", getField(form, "product_type").value);
  appendIfValue(formData, "name", getField(form, "name").value);
  appendIfValue(formData, "description", getField(form, "description").value);
  appendIfValue(formData, "price", getField(form, "price").value);
  appendIfValue(formData, "discount_price", getField(form, "discount_price").value);
  appendIfValue(formData, "preparation_time", getField(form, "preparation_time").value);
  appendIfValue(formData, "calories", getField(form, "calories").value);
  const serializedIngredients = serializeIngredientRows(readIngredientRows());
  if (serializedIngredients.error) {
    setError(serializedIngredients.error);
    return;
  }
  appendIfValue(formData, "ingredients", serializedIngredients.value);
  formData.append("ingredient_details", JSON.stringify(serializedIngredients.details));
  const serializedAllergens = serializeAllergenRows(readAllergenRows());
  appendIfValue(formData, "allergens", serializedAllergens);
  appendIfValue(formData, "video_url", getField(form, "video_url").value);
  const currentProduct = state.products.find((item) => item.id === state.editingProductId);
  formData.append("is_available", String(currentProduct?.is_available ?? true));
  formData.append("is_popular", String(currentProduct?.is_popular ?? false));
  formData.append("has_audio", String(currentProduct?.has_audio ?? true));
  const videoField = getField(form, "video_file");
  const videoUrl = getField(form, "video_url").value.trim();
  const hasUploadedVideo = Boolean(videoField.files[0]);
  if (hasUploadedVideo) formData.append("video_file", videoField.files[0]);
  if (!state.editingProductId && !hasUploadedVideo && !videoUrl) {
    setError("Adaugă un fișier video sau un Video URL înainte să salvezi produsul.");
    return;
  }

  try {
    const isEditingProduct = Boolean(state.editingProductId);
    state.loading = true;
    state.error = "";
    state.notice = "";
    render();

    let savedProduct;
    if (isEditingProduct) {
      savedProduct = await apiFetch(`restaurant-owner/products/${state.editingProductId}/`, {
        method: "PATCH",
        body: formData,
        headers: {},
      });
    } else {
      savedProduct = await apiFetch("restaurant-owner/products/", {
        method: "POST",
        body: formData,
        headers: {},
      });
    }
    if (!savedProduct?.video_url) {
      if (!isEditingProduct && savedProduct?.id) {
        try {
          await apiFetch(`restaurant-owner/products/${savedProduct.id}/`, { method: "DELETE" });
        } catch {}
      }
      state.loading = false;
      await reloadProducts();
      render();
      setError(
        isEditingProduct
          ? "Produsul a fost salvat, dar serverul nu a atașat video-ul. Verifică upload-ul sau adaugă un Video URL."
          : "Produsul nu a fost adăugat. Serverul nu a atașat video-ul; reîncarcă dashboard-ul sau verifică backend-ul folosit.",
      );
      return;
    }
    resetProductEditing(false);
    await reloadProducts();
    render();
    setNotice(isEditingProduct ? "Produsul a fost salvat." : "Produsul a fost adăugat.");
  } catch (error) {
    state.loading = false;
    setError(error.message);
  }
}

function startProductEdit(productId) {
  state.editingProductId = productId;
  render();
  requestAnimationFrame(() => {
    document.querySelector(".shell-main")?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function resetProductEditing(shouldRender = true) {
  state.editingProductId = null;
  if (shouldRender) render();
}

async function deleteProduct(productId) {
  try {
    await apiFetch(`restaurant-owner/products/${productId}/`, { method: "DELETE" });
    if (state.editingProductId === productId) resetProductEditing(false);
    await reloadProducts();
    render();
    setNotice("Produsul a fost șters.");
  } catch (error) {
    setError(error.message);
  }
}

function requestProductDeletion(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  openConfirmation({
    title: "Ștergi acest produs?",
    message: `Produsul „${product.name}” va fi eliminat din dashboard și din aplicație.`,
    confirmLabel: "Șterge produsul",
    confirmTone: "danger",
    onConfirm: () => deleteProduct(productId),
  });
}

function handleOrderStatusFilterChange(event) {
  const status = event.currentTarget.dataset.orderStatusFilter;
  if (!status) return;
  state.orderFilters.status = status;
  render();
}

async function handleCopyOrderAddress(event) {
  const orderId = Number(event.currentTarget.dataset.copyAddress);
  const order = state.orders.find((item) => item.id === orderId);
  if (!order?.address_summary) return;
  try {
    await navigator.clipboard.writeText(order.address_summary);
    setNotice(`Adresa comenzii #${orderId} a fost copiată.`);
  } catch {
    setError("Nu am putut copia adresa.");
  }
}

async function handleOrderUpdate(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  if (formElement.dataset.submitting === "true") return;

  formElement.dataset.submitting = "true";
  const submitButton = formElement.querySelector('.order-toolbar-submit, button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalLabel = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="ri-loader-4-line" aria-hidden="true"></i>Se actualizează...';
  }

  const orderId = Number(formElement.dataset.orderForm);
  const form = new FormData(formElement);
  try {
    const courierRawValue = String(form.get("courier_id") || "").trim();
    const payload = {
      order_status: form.get("order_status"),
      restaurant_note: form.get("restaurant_note"),
    };
    if (event.currentTarget.querySelector('[name="courier_id"]')) {
      payload.courier_id = courierRawValue ? Number(courierRawValue) : null;
    }
    await apiFetch(`restaurant-owner/orders/${orderId}/status/`, {
      method: "PATCH",
      body: payload,
    });
    state.unseenOrderIds = state.unseenOrderIds.filter((id) => id !== orderId);
    await Promise.all([reloadOrders({ shouldNotify: false }), reloadCouriers()]);
    render();
    setNotice(`Comanda #${orderId} a fost actualizată.`);
  } catch (error) {
    formElement.dataset.submitting = "false";
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = submitButton.dataset.originalLabel || "Actualizează";
    }
    setError(error.message);
  }
}

async function handleCreateRestaurant(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim();
  const city = String(form.get("city") || "").trim();
  const address = String(form.get("address") || "").trim();
  const latitude = String(form.get("latitude") || "").trim();
  const longitude = String(form.get("longitude") || "").trim();

  if (!name || !city || !address) {
    setError("Completează numele, orașul și adresa înainte să creezi restaurantul.");
    return;
  }

  try {
    await apiFetch("restaurant-owner/restaurants/", {
      method: "POST",
      body: {
        name,
        city,
        address,
        email: form.get("email"),
        phone: form.get("phone"),
        description: form.get("description"),
        delivery_fee: form.get("delivery_fee") || "0",
        minimum_order: form.get("minimum_order") || "0",
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        is_active: false,
      },
    });
    await fetchOwnerData();
    setNotice("Restaurantul a fost creat.");
  } catch (error) {
    setError(error.message);
  }
}

function replaceRestaurant(updatedRestaurant) {
  state.restaurants = state.restaurants.map((item) => (item.id === updatedRestaurant.id ? updatedRestaurant : item));
}

function appendIfValue(formData, key, value) {
  if (value !== null && value !== undefined && String(value).trim() !== "") {
    formData.append(key, value);
  }
}

function normalizeTime(value) {
  if (!value) return null;
  return `${value}:00`;
}

function getField(form, name) {
  return form.querySelector(`[name="${name}"]`);
}

function getInitials(value) {
  return String(value || "Y")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
}

function formatOrderDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
}

function formatAccountDate(value) {
  if (!value) return "Nu există încă";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nu există încă";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUserRole(value) {
  return {
    restaurant_owner: "Owner restaurant",
    admin: "Administrator",
    courier: "Curier",
    customer: "Client",
  }[value] || value || "-";
}

function renderAccountItem(label, value, helper = "") {
  return `
    <div class="account-item">
      <strong>${escapeHtml(label)}</strong>
      <div>${escapeHtml(value || "-")}</div>
      ${helper ? `<small>${escapeHtml(helper)}</small>` : ""}
    </div>
  `;
}

function getAccountStatusMeta(user) {
  if (user?.is_active) {
    return {
      label: "Cont activ",
      helper: "Contul poate accesa dashboard-ul și operațiile restaurantului.",
      toneClass: "",
    };
  }
  return {
    label: "Cont inactiv",
    helper: "Accesul este blocat până la activare sau confirmarea emailului.",
    toneClass: "is-muted",
  };
}

function getVerificationStatusMeta(user) {
  if (user?.is_active) {
    return {
      label: "Email confirmat",
      helper: "Adresa de email este activă pentru autentificare și notificări.",
      toneClass: "",
    };
  }
  return {
    label: "Email neconfirmat",
    helper: "Retrimite linkul de verificare dacă nu ai finalizat confirmarea.",
    toneClass: "is-muted",
  };
}

function getCurrentBrowserLabel() {
  const userAgent = navigator.userAgent || "";
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return "Opera";
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return "Google Chrome";
  if (/Firefox\//.test(userAgent)) return "Mozilla Firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return "Browser necunoscut";
}

function getCurrentDeviceLabel() {
  const userAgent = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iPhone / iPad";
  if (/Android/.test(userAgent)) return "Telefon Android";
  if (/Mac OS X/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows PC";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Dispozitiv necunoscut";
}

function formatDistanceKm(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return "-";
  return `${distance.toLocaleString("ro-RO", { minimumFractionDigits: distance < 10 ? 1 : 0, maximumFractionDigits: 1 })} km`;
}

function formatDeliveryWindow(windowValue) {
  const min = Number(windowValue?.min);
  const max = Number(windowValue?.max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `${min}-${max} min`;
  }
  if (Number.isFinite(min)) return `${min} min`;
  if (Number.isFinite(max)) return `${max} min`;
  return "-";
}

function formatFulfillmentTypeLabel(order) {
  return FULFILLMENT_TYPE_LABELS[order.fulfillment_type] || order.fulfillment_type_label || order.fulfillment_type || "Comandă";
}

function formatPaymentMethodLabel(order) {
  return PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method_label || order.payment_method || "-";
}

function formatPaymentStatusLabel(order) {
  return PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status_label || order.payment_status || "-";
}

function formatVehicleTypeLabel(value) {
  return {
    bike: "Bicicletă",
    scooter: "Scuter",
    car: "Mașină",
    walk: "Pe jos",
  }[value] || value || "-";
}

function formatCustomerNote(value) {
  const parts = String(value || "")
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const [lead, ...details] = parts;
  return `
    <span>${escapeHtml(lead)}</span>
    ${details.map((detail) => `<span class="order-note-detail">${escapeHtml(detail)}</span>`).join("")}
  `;
}

function getVisibleOrders() {
  const filteredOrders = state.orders.filter((order) => order.order_status === state.orderFilters.status);

  return filteredOrders.sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    const leftPriority = isPendingPriorityOrder(left) ? 1 : 0;
    const rightPriority = isPendingPriorityOrder(right) ? 1 : 0;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    const leftUnseen = state.unseenOrderIds.includes(left.id) ? 1 : 0;
    const rightUnseen = state.unseenOrderIds.includes(right.id) ? 1 : 0;
    if (leftUnseen !== rightUnseen) return rightUnseen - leftUnseen;
    return rightTime - leftTime;
  });
}

function isPendingPriorityOrder(order) {
  if (order.order_status !== "pending") return false;
  return !(order.events || []).some((event) => event.event_type === "status_changed" || event.event_type === "courier_assigned");
}

function getElapsedMinutes(value) {
  if (!value) return 0;
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
}

function formatElapsedSince(value) {
  const elapsedMinutes = getElapsedMinutes(value);
  if (elapsedMinutes < 1) return "Acum";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m de la plasare`;
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return `${hours}h ${minutes}m de la plasare`;
}

function getOrderSlaInfo(order) {
  const elapsedMinutes = getElapsedMinutes(order.created_at);
  const deliveryMin = Number(order.estimated_delivery_window_minutes?.min || 25);
  const targets = {
    pending: { label: "Confirmă în max. 2 min", overdueLabel: "Întârzie confirmarea", targetMinutes: 2 },
    accepted: { label: "Confirmată", overdueLabel: "Întârzie pregătirea", targetMinutes: 2 },
    preparing: { label: "Pregătește comanda", overdueLabel: "Întârzie prepararea", targetMinutes: Math.max(12, Math.round(deliveryMin * 0.6)) },
    ready_for_pickup: { label: "Pregătită pentru ridicare", overdueLabel: "Întârzie ridicarea", targetMinutes: deliveryMin },
    picked_up: { label: "Comanda a fost preluată", overdueLabel: "Întârzie plecarea către client", targetMinutes: deliveryMin + 10 },
    on_the_way: { label: "Curier pe drum", overdueLabel: "Întârzie livrarea", targetMinutes: deliveryMin + 20 },
  };
  const defaultInfo = targets[order.order_status];
  if (!defaultInfo) {
    return { label: "Istoric închis", tone: "success" };
  }
  if (elapsedMinutes <= defaultInfo.targetMinutes) {
    return { label: defaultInfo.label, tone: "success" };
  }
  return { label: `${defaultInfo.overdueLabel} · +${elapsedMinutes - defaultInfo.targetMinutes}m`, tone: "warning" };
}

function buildOrderMapUrl(order) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address_summary || "")}`;
}

function formatOrderEventLabel(event) {
  if (event.event_type === "courier_assigned") {
    return `Curier asignat: ${event.courier_name || event.courier_email || "necunoscut"}`;
  }
  if (event.event_type === "created") {
    return "Comandă plasată";
  }
  const nextStatusLabel = ORDER_STATUS_LABELS[event.next_status] || event.next_status || "Actualizare";
  return `Status schimbat în ${nextStatusLabel}`;
}

function formatOrderEventMeta(event) {
  const actor = event.actor_name || event.actor_email || sourceLabelForEvent(event.source);
  return `${actor} · ${formatOrderDate(event.created_at)}`;
}

function sourceLabelForEvent(source) {
  return {
    restaurant: "Restaurant",
    courier: "Curier",
    payment: "Plată",
    customer_create: "Client",
    customer_cancel: "Client",
  }[source] || "Sistem";
}

function renderIngredientRows(rows) {
  const safeRows = rows.length ? rows : [EMPTY_INGREDIENT_ROW];
  return safeRows.map((row) => renderIngredientRow(row)).join("");
}

function renderIngredientRow(row = EMPTY_INGREDIENT_ROW) {
  return `
    <div class="ingredient-row" data-ingredient-row>
      <div class="ingredient-name-field">
        <input name="ingredient_name" placeholder="Nume ingredient" value="${escapeHtml(row.name || "")}" autocomplete="off" />
        <div class="ingredient-suggestions" data-ingredient-suggestions></div>
      </div>
      <div class="ingredient-detail-grid">
        <label class="ingredient-detail-field">
          <span>Gramaj (g)</span>
          <input name="ingredient_grams" type="number" min="0" step="1" placeholder="Gramaj (g)" value="${escapeHtml(row.grams || "")}" />
        </label>
        <label class="ingredient-detail-field">
          <span>Calorii</span>
          <input name="ingredient_calories" type="number" min="0" step="1" placeholder="Calorii" value="${escapeHtml(row.calories || "")}" />
        </label>
        <label class="ingredient-detail-field">
          <span>Preț extra / 20g</span>
          <input name="ingredient_price_per_20g" type="number" min="0" step="0.01" placeholder="Preț / 20g" value="${escapeHtml(row.price_per_20g || "")}" />
        </label>
        <label class="ingredient-detail-field">
          <span>Disponibilitate extra</span>
          <select name="ingredient_can_add_extra" aria-label="Disponibilitate extra">
            <option value="true" ${String(row.can_add_extra ?? "true") === "true" ? "selected" : ""}>Se poate adăuga extra</option>
            <option value="false" ${String(row.can_add_extra) === "false" ? "selected" : ""}>Nu se poate comanda extra</option>
          </select>
        </label>
        <button class="ghost-button ingredient-remove-button" type="button" data-remove-ingredient aria-label="Șterge ingredient">
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}

function appendIngredientRow(row = EMPTY_INGREDIENT_ROW) {
  const container = document.querySelector("[data-ingredient-rows]");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", renderIngredientRow(row));
}

function setIngredientRows(rows) {
  const container = document.querySelector("[data-ingredient-rows]");
  if (!container) return;
  container.innerHTML = renderIngredientRows(rows);
}

function removeIngredientRow(rowElement) {
  const container = document.querySelector("[data-ingredient-rows]");
  if (!container || !rowElement) return;
  if (container.children.length <= 1) {
    setIngredientRows([EMPTY_INGREDIENT_ROW]);
    return;
  }
  rowElement.remove();
}

function readIngredientRows() {
  return Array.from(document.querySelectorAll("[data-ingredient-row]")).map((row) => ({
    name: canonicalizeIngredientName(row.querySelector('[name="ingredient_name"]')?.value?.trim() || ""),
    grams: row.querySelector('[name="ingredient_grams"]')?.value?.trim() || "",
    calories: row.querySelector('[name="ingredient_calories"]')?.value?.trim() || "",
    price_per_20g: row.querySelector('[name="ingredient_price_per_20g"]')?.value?.trim() || "",
    can_add_extra: row.querySelector('[name="ingredient_can_add_extra"]')?.value || "true",
  }));
}

function serializeIngredientRows(rows) {
  const normalizedRows = rows
    .map((row) => ({
      name: row.name.trim(),
      grams: row.grams.trim(),
      calories: row.calories.trim(),
      price_per_20g: row.price_per_20g.trim(),
      can_add_extra: String(row.can_add_extra || "true"),
    }))
    .filter((row) => row.name || row.grams || row.calories || row.price_per_20g);

  for (const row of normalizedRows) {
    if (!row.name) {
      return { value: "", error: "Completează numele ingredientului sau șterge rândul gol." };
    }
  }

  const details = normalizedRows.map((row) => ({
    name: row.name,
    grams: row.grams ? Number(row.grams) : null,
    calories: row.calories ? Number(row.calories) : null,
    price_per_20g: row.price_per_20g || null,
    can_add_extra: row.can_add_extra !== "false",
  }));

  return {
    value: details
      .map((row) => {
        const details = [];
        if (row.grams) details.push(`${row.grams}g`);
        if (row.calories) details.push(`${row.calories} kcal`);
        return [row.name, ...details].join(" ");
      })
      .join(", "),
    details,
    error: "",
  };
}

function parseIngredientRows(value) {
  if (Array.isArray(value)) {
    const rows = value
      .map((item) => ({
        name: String(item?.name || "").trim(),
        grams: item?.grams != null ? String(item.grams) : "",
        calories: item?.calories != null ? String(item.calories) : "",
        price_per_20g:
          item?.price_per_20g != null
            ? String(item.price_per_20g)
            : item?.pricePer20g != null
              ? String(item.pricePer20g)
              : item?.extra_price_per_20g != null
                ? String(item.extra_price_per_20g)
                : item?.extraPricePer20g != null
                  ? String(item.extraPricePer20g)
                  : "",
        can_add_extra:
          item?.can_add_extra === false ||
          item?.canAddExtra === false ||
          item?.extra_available === false ||
          item?.can_order_extra === false
            ? "false"
            : "true",
      }))
      .filter((item) => item.name || item.grams || item.calories || item.price_per_20g);
    return rows.length ? rows : [EMPTY_INGREDIENT_ROW];
  }

  const raw = String(value || "").trim();
  if (!raw) return [EMPTY_INGREDIENT_ROW];
  if (raw.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(raw);
      return parseIngredientRows(parsedValue);
    } catch {}
  }

  const entries = raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const rows = entries.map((entry) => {
    const match = entry.match(/^(.*?)(?:\s+(\d+)g)?(?:\s+(\d+)\s*kcal)?$/i);
    if (!match) return { name: entry, grams: "", calories: "" };
    return {
      name: (match[1] || "").trim(),
      grams: match[2] || "",
      calories: match[3] || "",
      price_per_20g: "",
      can_add_extra: "true",
    };
  });

  return rows.length ? rows : [EMPTY_INGREDIENT_ROW];
}

function normalizeIngredientText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCatalogSuggestions(query, catalog, limit = MAX_INGREDIENT_SUGGESTIONS) {
  const normalizedQuery = normalizeIngredientText(query);
  if (!normalizedQuery) return [];

  return catalog
    .map((item) => {
      const normalizedItem = normalizeIngredientText(item);
      let score = 999;
      if (normalizedItem === normalizedQuery) score = 0;
      else if (normalizedItem.startsWith(normalizedQuery)) score = 1;
      else if (normalizedItem.includes(normalizedQuery)) score = 2;
      else {
        const distance = levenshteinDistance(normalizedQuery, normalizedItem);
        if (distance <= Math.max(2, Math.floor(normalizedQuery.length / 3))) score = 10 + distance;
      }
      return { item, score };
    })
    .filter((item) => item.score < 999)
    .sort((left, right) => left.score - right.score || left.item.localeCompare(right.item, "ro"))
    .slice(0, limit)
    .map((item) => item.item);
}

function levenshteinDistance(source, target) {
  if (source === target) return 0;
  if (!source.length) return target.length;
  if (!target.length) return source.length;

  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array(target.length + 1).fill(0);

  for (let i = 0; i < source.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < target.length; j += 1) {
      const insertion = current[j] + 1;
      const deletion = previous[j + 1] + 1;
      const substitution = previous[j] + (source[i] === target[j] ? 0 : 1);
      current[j + 1] = Math.min(insertion, deletion, substitution);
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }

  return previous[target.length];
}

function canonicalizeIngredientName(value) {
  const normalizedValue = normalizeIngredientText(value);
  if (!normalizedValue) return "";
  const exactMatch = INGREDIENT_CATALOG.find((item) => normalizeIngredientText(item) === normalizedValue);
  return exactMatch || value.trim();
}

function getIngredientSuggestions(query) {
  return getCatalogSuggestions(query, INGREDIENT_CATALOG);
}

function renderIngredientSuggestions(input) {
  const row = input.closest("[data-ingredient-row]");
  const container = row?.querySelector("[data-ingredient-suggestions]");
  if (!row || !container) return;

  const suggestions = getIngredientSuggestions(input.value).filter((item) => item !== input.value.trim());
  if (!suggestions.length) {
    closeIngredientSuggestions(row);
    return;
  }

  container.innerHTML = suggestions
    .map(
      (item) => `
        <button type="button" class="ingredient-suggestion" data-ingredient-suggestion="${escapeHtml(item)}">
          ${escapeHtml(item)}
        </button>
      `,
    )
    .join("");
  container.classList.add("is-visible");
}

function closeIngredientSuggestions(rowElement) {
  const container = rowElement?.querySelector("[data-ingredient-suggestions]");
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("is-visible");
}

function canonicalizeIngredientInput(input) {
  if (!input) return;
  input.value = canonicalizeIngredientName(input.value);
}

function renderAllergenRows(rows) {
  const safeRows = rows.length ? rows : [""];
  return safeRows.map((row) => renderAllergenRow(row)).join("");
}

function renderAllergenRow(value = "") {
  return `
    <div class="allergen-row" data-allergen-row>
      <div class="ingredient-name-field">
        <input name="allergen_name" placeholder="Nume alergen" value="${escapeHtml(value || "")}" autocomplete="off" />
        <div class="ingredient-suggestions" data-allergen-suggestions></div>
      </div>
      <button class="ghost-button ingredient-remove-button" type="button" data-remove-allergen aria-label="Șterge alergen">
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

function appendAllergenRow(value = "") {
  const container = document.querySelector("[data-allergen-rows]");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", renderAllergenRow(value));
}

function setAllergenRows(rows) {
  const container = document.querySelector("[data-allergen-rows]");
  if (!container) return;
  container.innerHTML = renderAllergenRows(rows);
}

function removeAllergenRow(rowElement) {
  const container = document.querySelector("[data-allergen-rows]");
  if (!container || !rowElement) return;
  if (container.children.length <= 1) {
    setAllergenRows([""]);
    return;
  }
  rowElement.remove();
}

function readAllergenRows() {
  return Array.from(document.querySelectorAll("[data-allergen-row]")).map((row) =>
    canonicalizeAllergenName(row.querySelector('[name="allergen_name"]')?.value?.trim() || ""),
  );
}

function serializeAllergenRows(rows) {
  return rows.filter(Boolean).join(", ");
}

function parseAllergenRows(value) {
  const raw = String(value || "").trim();
  if (!raw) return [""];
  const rows = raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return rows.length ? rows : [""];
}

function canonicalizeAllergenName(value) {
  const normalizedValue = normalizeIngredientText(value);
  if (!normalizedValue) return "";
  const exactMatch = ALLERGEN_CATALOG.find((item) => normalizeIngredientText(item) === normalizedValue);
  return exactMatch || value.trim();
}

function getAllergenSuggestions(query) {
  return getCatalogSuggestions(query, ALLERGEN_CATALOG);
}

function renderAllergenSuggestions(input) {
  const row = input.closest("[data-allergen-row]");
  const container = row?.querySelector("[data-allergen-suggestions]");
  if (!row || !container) return;

  const suggestions = getAllergenSuggestions(input.value).filter((item) => item !== input.value.trim());
  if (!suggestions.length) {
    closeAllergenSuggestions(row);
    return;
  }

  container.innerHTML = suggestions
    .map(
      (item) => `
        <button type="button" class="ingredient-suggestion" data-allergen-suggestion="${escapeHtml(item)}">
          ${escapeHtml(item)}
        </button>
      `,
    )
    .join("");
  container.classList.add("is-visible");
}

function closeAllergenSuggestions(rowElement) {
  const container = rowElement?.querySelector("[data-allergen-suggestions]");
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("is-visible");
}

function canonicalizeAllergenInput(input) {
  if (!input) return;
  input.value = canonicalizeAllergenName(input.value);
}

window.addEventListener("hashchange", () => {
  state.currentView = location.hash.replace("#", "") || DEFAULT_DASHBOARD_VIEW;
  render();
});

bootstrap();
