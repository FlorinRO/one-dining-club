const LOCAL_DASHBOARD_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const FALLBACK_API_BASE = LOCAL_DASHBOARD_HOSTS.has(location.hostname)
  ? "http://127.0.0.1:8000/api"
  : "https://api.yumzy.ro/api";
const QUERY_API_BASE = normalizeConfiguredApiBase(
  new URLSearchParams(location.search).get("api") || new URLSearchParams(location.search).get("apiBase"),
);
if (QUERY_API_BASE) {
  localStorage.setItem("yumzyDashboardApiBase", QUERY_API_BASE);
}
const DEFAULT_API_BASE = QUERY_API_BASE || localStorage.getItem("yumzyDashboardApiBase") || FALLBACK_API_BASE;
const DAY_LABELS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const ORDER_STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
const OWNER_STATUS_OPTIONS = [
  "accepted",
  "preparing",
  "ready_for_pickup",
  "rejected",
  "cancelled",
];
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
const AUTH_VIDEO_SOURCES = [
  {
    src: "../assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-full-hd.mp4",
    poster: "../assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-poster.jpg",
  },
  {
    src: "../assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-full-hd.mp4",
    poster: "../assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-poster.jpg",
  },
  {
    src: "../assets/login-videos/mixkit-man-eating-a-hamburger-372-hd-ready.mp4",
    poster: "../assets/login-videos/mixkit-man-eating-a-hamburger-372-poster.jpg",
  },
  {
    src: "../assets/login-videos/mixkit-woman-eating-noodles-41350-full-hd.mp4",
    poster: "../assets/login-videos/mixkit-woman-eating-noodles-41350-poster.jpg",
  },
];
const AUTH_VIDEO_VISIBLE_MS = 4000;
const AUTH_VIDEO_CROSSFADE_MS = 1000;
const AUTH_VIDEO_TRANSITION_DELAY_MS = AUTH_VIDEO_VISIBLE_MS - AUTH_VIDEO_CROSSFADE_MS;
const DEFAULT_DASHBOARD_VIEW = "overview";
const NAV_ITEMS = [
  { view: "overview", label: "Overview", icon: "ri-dashboard-2-line" },
  { view: "profile", label: "Profil restaurant", icon: "ri-store-2-line" },
  { view: "products", label: "Produse & video", icon: "ri-video-on-line" },
  { view: "orders", label: "Comenzi", icon: "ri-bill-line" },
  { view: "account", label: "Cont", icon: "ri-user-settings-line" },
];
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
  selectedRestaurantId: null,
  editingProductId: null,
  avatarPreviewUrls: {},
  loading: false,
  error: "",
  notice: "",
};

const app = document.querySelector("#app");

function playAuthVideo(video) {
  if (!video) return;
  video.muted = true;
  video.loop = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  const playAttempt = video.play();
  if (playAttempt?.catch) {
    playAttempt.catch(() => {});
  }
}

function primeAuthVideo(video, source) {
  if (!video || !source) return;
  video.muted = true;
  video.loop = true;
  video.src = source.src;
  video.poster = source.poster;
  video.currentTime = 0;
  video.addEventListener("loadeddata", () => playAuthVideo(video), { once: true });
  video.addEventListener("canplay", () => playAuthVideo(video), { once: true });
  video.load();
  playAuthVideo(video);
}

function bootAuthVideos() {
  const layers = Array.from(document.querySelectorAll(".auth-video-layer"));
  const videos = layers.map((layer) => layer.querySelector(".auth-video"));
  if (layers.length !== 2 || videos.length !== 2 || AUTH_VIDEO_SOURCES.length < 2) return;

  let activeLayerIndex = 0;
  let nextVideoIndex = 2 % AUTH_VIDEO_SOURCES.length;
  let transitionLocked = false;

  primeAuthVideo(videos[0], AUTH_VIDEO_SOURCES[0]);
  primeAuthVideo(videos[1], AUTH_VIDEO_SOURCES[1]);

  const scheduleTransition = () => {
    window.setTimeout(() => {
      if (transitionLocked) return;

      const hiddenLayerIndex = activeLayerIndex === 0 ? 1 : 0;
      const activeLayer = layers[activeLayerIndex];
      const hiddenLayer = layers[hiddenLayerIndex];
      const hiddenVideo = videos[hiddenLayerIndex];

      if (!hiddenLayer || !hiddenVideo || hiddenVideo.readyState < 2) {
        scheduleTransition();
        return;
      }

      transitionLocked = true;
      playAuthVideo(hiddenVideo);
      hiddenLayer.classList.add("is-active");
      activeLayer.classList.remove("is-active");

      window.setTimeout(() => {
        activeLayerIndex = hiddenLayerIndex;
        const recycledIndex = activeLayerIndex === 0 ? 1 : 0;
        primeAuthVideo(videos[recycledIndex], AUTH_VIDEO_SOURCES[nextVideoIndex]);
        nextVideoIndex = (nextVideoIndex + 1) % AUTH_VIDEO_SOURCES.length;
        transitionLocked = false;
        scheduleTransition();
      }, AUTH_VIDEO_CROSSFADE_MS + 140);
    }, AUTH_VIDEO_TRANSITION_DELAY_MS);
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      videos.forEach(playAuthVideo);
    }
  });
  window.addEventListener("focus", () => videos.forEach(playAuthVideo));
  scheduleTransition();
}

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
  render();
}

function setError(message) {
  state.error = message;
  state.notice = "";
  render();
}

function setView(view) {
  state.currentView = view;
  location.hash = view;
  render();
}

function setSelectedRestaurant(restaurantId) {
  state.selectedRestaurantId = restaurantId ? Number(restaurantId) : null;
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
    persistSelectedRestaurant();
    return;
  }

  state.selectedRestaurantId = state.restaurants[0].id;
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
  for (const value of Object.values(payload)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value[0]) return value[0];
  }
  return "A apărut o eroare neașteptată.";
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
      await Promise.all([reloadProducts(), reloadOrders(), reloadCategories()]);
    } else {
      state.productCategories = [];
      state.products = [];
      state.orders = [];
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

async function reloadOrders() {
  const payload = await apiFetch("restaurant-owner/orders/", { params: selectedRestaurantParams() });
  state.orders = payload.results || payload;
}

async function reloadCategories() {
  const payload = await apiFetch("restaurant-owner/categories/", { params: selectedRestaurantParams() });
  state.productCategories = payload.results || payload;
}

function render() {
  app.innerHTML = state.user ? renderDashboard() : renderLogin();
  bindEvents();
}

function renderLogin() {
  return `
    <div class="login-shell">
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
          ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}
          ${state.notice ? `<div class="success-banner">${escapeHtml(state.notice)}</div>` : ""}
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
            ${state.loading && !isInitialDashboardLoading ? `<span class="status-chip">Se încarcă...</span>` : ""}
            ${state.notice ? `<span class="status-chip delivered dashboard-notice">${escapeHtml(state.notice)}</span>` : ""}
            ${state.error ? `<span class="status-chip cancelled">${escapeHtml(state.error)}</span>` : ""}
          </div>
        </div>
        ${dashboardContent}
      </main>
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
            <span>Completează întâi numele, orașul, adresa și descrierea. Acestea influențează direct conversia.</span>
          </div>
          <div class="profile-card-fields">
            <div class="split">
              <label class="field"><span>Nume restaurant</span><input name="name" value="${escapeHtml(restaurant.name || "")}" placeholder="Ex: Yumzy Kitchen" required /></label>
              <label class="field">
                <span>Oraș</span>
                <select name="city" required>
                  ${renderRomaniaCityOptions(restaurant.city || "")}
                </select>
              </label>
            </div>
            <label class="field"><span>Adresă</span><input name="address" value="${escapeHtml(restaurant.address || "")}" placeholder="Stradă, număr, zonă" required /></label>
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
                <input type="number" step="0.01" name="delivery_fee" value="${restaurant.delivery_fee || 0}" ${pickupOnly ? "disabled" : ""} data-delivery-fee />
                <small>Setează costul standard pentru livrare.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Comandă minimă</span>
                <input type="number" step="0.01" name="minimum_order" value="${restaurant.minimum_order || 0}" />
                <small>Pragul minim pentru plasarea comenzii.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Timp livrare minim</span>
                <input type="number" name="estimated_delivery_time_min" value="${restaurant.estimated_delivery_time_min || 25}" />
                <small>Estimarea optimistă afișată în aplicație.</small>
              </label>
              <label class="field ops-metric-card">
                <span>Timp livrare maxim</span>
                <input type="number" name="estimated_delivery_time_max" value="${restaurant.estimated_delivery_time_max || 45}" />
                <small>Estimarea conservatoare pentru client.</small>
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

        ${
          profileCompletion.isComplete
            ? `
              <div class="profile-save-bar">
                <div>
                  <strong>Gata de publicat?</strong>
                  <span>Salvarea actualizează profilul din aplicația YUMZY.</span>
                </div>
                <button class="button" type="submit"><i class="ri-save-3-line" aria-hidden="true"></i> Salvează profilul</button>
              </div>
            `
            : ""
        }
      </form>
    </div>
  `;
}

function renderRestaurantPublishPanel(restaurant) {
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
  const productsWithVideo = state.products.filter((product) => product.video_url);
  return `
    <section class="panel product-workbench">
      <div class="section-header">
        <div>
          <h2>${state.editingProductId ? "Editează produs" : "Produs nou"}</h2>
          <small>Completează întâi informațiile esențiale, apoi atașează imaginea și video-ul produsului.</small>
        </div>
        <span class="status-chip pending"><i class="ri-video-on-line" aria-hidden="true"></i> Video-ready</span>
      </div>
      <form id="product-form" class="form-grid">
        <div class="form-section">
          <div class="form-section-title">
            <strong>Informații de bază</strong>
            <span>Nume, categorie, descriere și preț.</span>
          </div>
          <div class="form-section-fields">
            <div class="split">
              <label class="field"><span>Nume produs</span><input name="name" placeholder="Ex: Smash burger cu cheddar" required /></label>
              <label class="field">
                <span>Categorie</span>
                <select name="category_id">
                  <option value="">Fără categorie</option>
                  ${state.productCategories.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}
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
            <div class="split">
              <label class="field"><span>Ingrediente</span><input name="ingredients" placeholder="carne, cheddar, sos..." /></label>
              <label class="field"><span>Alergeni</span><input name="allergens" placeholder="gluten, lactoză..." /></label>
            </div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">
            <strong>Media produs</strong>
            <span>Video-ul este elementul principal în experiența YUMZY.</span>
          </div>
          <div class="form-section-fields">
            <div class="split">
              <label class="field"><span>Video produs</span><input type="file" name="video_file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" /></label>
              <label class="field"><span>Audio URL</span><input type="url" name="audio_url" placeholder="https://..." /></label>
            </div>
            <label class="field"><span>Video URL</span><input type="url" name="video_url" placeholder="https://..." /></label>
            <label class="field"><span>Imagine produs</span><input type="file" name="image" accept="image/*" /></label>
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
        <h2>Video-uri existente</h2>
        <small>Apar doar produsele cu video pentru restaurantul curent.</small>
      </div>
      <span class="status-chip pending">${productsWithVideo.length} video</span>
    </div>
    <section class="products-grid">
      ${productsWithVideo.length
        ? productsWithVideo
            .map(
              (product) => `
                <article class="product-card">
                  ${renderProductMedia(product)}
                  <div class="section-header">
                    <div>
                      <h3>${escapeHtml(product.name)}</h3>
                      <small>${escapeHtml(product.category_name || "Fără categorie")}</small>
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
        : `<article class="empty-card"><h3>Niciun video</h3><small>Adaugă un produs cu fișier video sau Video URL.</small></article>`}
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
  return `
    <section class="orders-grid">
      ${state.orders.length
        ? state.orders
            .map(
              (order) => `
                <article class="order-card">
                  <div class="section-header">
                    <div>
                      <h3>Comanda #${order.id}</h3>
                      <small>${escapeHtml(order.customer_email || "")}</small>
                    </div>
                    <span class="status-chip ${order.order_status}">${escapeHtml(ORDER_STATUS_LABELS[order.order_status] || order.order_status)}</span>
                  </div>
                  <div class="order-total">${order.total} RON</div>
                  <div class="order-meta">${new Date(order.created_at).toLocaleString("ro-RO")}</div>
                  <div class="table-scroller">
                    <table>
                      <thead>
                        <tr><th>Produs</th><th>Cant.</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        ${(order.items || [])
                          .map(
                            (item) => `
                              <tr>
                                <td>${escapeHtml(item.product_name)}</td>
                                <td>${item.quantity}</td>
                                <td>${item.total_price} RON</td>
                              </tr>
                            `,
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                  <form class="toolbar" data-order-form="${order.id}">
                    <select name="order_status">
                      ${OWNER_STATUS_OPTIONS.map((status) => `<option value="${status}" ${status === order.order_status ? "selected" : ""}>${ORDER_STATUS_LABELS[status]}</option>`).join("")}
                    </select>
                    <input name="restaurant_note" value="${escapeHtml(order.restaurant_note || "")}" placeholder="Notă internă" />
                    <button class="button" type="submit">Actualizează</button>
                  </form>
                </article>
              `,
            )
            .join("")
        : `<article class="empty-card"><h3>Nu există comenzi</h3><small>Comenzile noi vor apărea aici.</small></article>`}
    </section>
  `;
}

function renderAccountView() {
  return `
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>Cont owner</h2>
          <small>Config și informații despre sesiunea activă.</small>
        </div>
      </div>
      <div class="account-grid">
        <div><strong>Email</strong><div class="muted">${escapeHtml(state.user?.email || "")}</div></div>
        <div><strong>Rol</strong><div class="muted">${escapeHtml(state.user?.role || "")}</div></div>
      </div>
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
        <div class="split">
          <label class="field"><span>Nume restaurant</span><input name="name" required /></label>
          <label class="field">
            <span>Oraș</span>
            <select name="city" required>
              ${renderRomaniaCityOptions("")}
            </select>
          </label>
        </div>
        <label class="field"><span>Adresă</span><input name="address" required /></label>
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
  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#logout-button")?.addEventListener("click", handleLogout);
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
  bindPhoneInputs();
  bindOperationalControls();
  bindFallbackImages();
  bindVideoPreviews();

  document.querySelector("#product-form")?.addEventListener("submit", handleProductSubmit);
  document.querySelector("#cancel-product-edit")?.addEventListener("click", resetProductEditing);
  document.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => startProductEdit(Number(button.dataset.editProduct)));
  });
  document.querySelectorAll("[data-delete-product]").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(Number(button.dataset.deleteProduct)));
  });

  document.querySelectorAll("[data-order-form]").forEach((form) => {
    form.addEventListener("submit", handleOrderUpdate);
  });

  document.querySelector("#create-restaurant-form")?.addEventListener("submit", handleCreateRestaurant);
  bindHoursToggles();
  hydrateEditingForms();
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
  if (state.editingProductId) {
    const product = state.products.find((item) => item.id === state.editingProductId);
    if (product) {
      const form = document.querySelector("#product-form");
      if (form) {
        getField(form, "name").value = product.name || "";
        getField(form, "category_id").value = product.category || "";
        getField(form, "description").value = product.description || "";
        getField(form, "price").value = product.price || "";
        getField(form, "discount_price").value = product.discount_price || "";
        getField(form, "preparation_time").value = product.preparation_time || 15;
        getField(form, "calories").value = product.calories || "";
        getField(form, "ingredients").value = product.ingredients || "";
        getField(form, "allergens").value = product.allergens || "";
        getField(form, "audio_url").value = product.audio_url || "";
        getField(form, "video_url").value = product.video_url || "";
        getField(form, "video_file").value = "";
      }
    }
  }
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

function handleLogout() {
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

async function handleProfileSubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = new FormData(event.currentTarget);
  const pickupOnly = form.get("pickup_only") === "on";
  const openingHours = DAY_LABELS.map((_, index) => {
    const isClosed = form.get(`is_closed_${index}`) === "on";
    return {
      day_of_week: index,
      opening_time: isClosed ? null : normalizeTime(form.get(`opening_time_${index}`)),
      closing_time: isClosed ? null : normalizeTime(form.get(`closing_time_${index}`)),
      is_closed: isClosed,
    };
  });

  try {
    const updated = await apiFetch(`restaurant-owner/restaurants/${restaurant.id}/`, {
      method: "PATCH",
      body: {
        name: form.get("name"),
        city: form.get("city"),
        address: form.get("address"),
        email: form.get("email"),
        phone: form.get("phone"),
        description: form.get("description"),
        website_url: form.get("website_url"),
        promo_video_url: form.get("promo_video_url"),
        instagram_url: form.get("instagram_url"),
        tiktok_url: form.get("tiktok_url"),
        delivery_fee: pickupOnly ? "0" : form.get("delivery_fee") || "0",
        minimum_order: form.get("minimum_order") || "0",
        estimated_delivery_time_min: Number(form.get("estimated_delivery_time_min") || 25),
        estimated_delivery_time_max: Number(form.get("estimated_delivery_time_max") || 45),
        supports_pickup: pickupOnly || form.get("supports_pickup") === "on",
        is_open: form.get("is_open") === "on",
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
  const categoryId = getField(form, "category_id").value;

  formData.append("restaurant_id", restaurant.id);
  appendIfValue(formData, "category_id", categoryId);
  appendIfValue(formData, "name", getField(form, "name").value);
  appendIfValue(formData, "description", getField(form, "description").value);
  appendIfValue(formData, "price", getField(form, "price").value);
  appendIfValue(formData, "discount_price", getField(form, "discount_price").value);
  appendIfValue(formData, "preparation_time", getField(form, "preparation_time").value);
  appendIfValue(formData, "calories", getField(form, "calories").value);
  appendIfValue(formData, "ingredients", getField(form, "ingredients").value);
  appendIfValue(formData, "allergens", getField(form, "allergens").value);
  appendIfValue(formData, "audio_url", getField(form, "audio_url").value);
  appendIfValue(formData, "video_url", getField(form, "video_url").value);
  const currentProduct = state.products.find((item) => item.id === state.editingProductId);
  formData.append("is_available", String(currentProduct?.is_available ?? true));
  formData.append("is_popular", String(currentProduct?.is_popular ?? false));
  formData.append("has_audio", String(currentProduct?.has_audio ?? true));
  const imageField = getField(form, "image");
  if (imageField.files[0]) formData.append("image", imageField.files[0]);
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

async function handleOrderUpdate(event) {
  event.preventDefault();
  const orderId = Number(event.currentTarget.dataset.orderForm);
  const form = new FormData(event.currentTarget);
  try {
    await apiFetch(`restaurant-owner/orders/${orderId}/status/`, {
      method: "PATCH",
      body: {
        order_status: form.get("order_status"),
        restaurant_note: form.get("restaurant_note"),
      },
    });
    await reloadOrders();
    render();
    setNotice(`Comanda #${orderId} a fost actualizată.`);
  } catch (error) {
    setError(error.message);
  }
}

async function handleCreateRestaurant(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await apiFetch("restaurant-owner/restaurants/", {
      method: "POST",
      body: {
        name: form.get("name"),
        city: form.get("city"),
        address: form.get("address"),
        email: form.get("email"),
        phone: form.get("phone"),
        description: form.get("description"),
        delivery_fee: form.get("delivery_fee") || "0",
        minimum_order: form.get("minimum_order") || "0",
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

window.addEventListener("hashchange", () => {
  state.currentView = location.hash.replace("#", "") || DEFAULT_DASHBOARD_VIEW;
  render();
});

bootAuthVideos();
bootstrap();
