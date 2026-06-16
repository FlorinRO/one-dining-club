const DEFAULT_API_BASE = "https://api.yumzy.ro/api";
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
  { view: "categories", label: "Categorii meniu", icon: "ri-folder-2-line" },
  { view: "products", label: "Produse & video", icon: "ri-video-on-line" },
  { view: "orders", label: "Comenzi", icon: "ri-bill-line" },
  { view: "account", label: "Cont", icon: "ri-user-settings-line" },
];

const state = {
  apiBase: DEFAULT_API_BASE,
  accessToken: localStorage.getItem("yumzyDashboardAccess") || "",
  refreshToken: localStorage.getItem("yumzyDashboardRefresh") || "",
  user: JSON.parse(localStorage.getItem("yumzyDashboardUser") || "null"),
  currentView: location.hash.replace("#", "") || DEFAULT_DASHBOARD_VIEW,
  restaurants: [],
  overview: [],
  productCategories: [],
  restaurantCategories: [],
  products: [],
  orders: [],
  selectedRestaurantId: null,
  editingCategoryId: null,
  editingProductId: null,
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
  if (/^https?:\/\//i.test(path)) return path;

  const apiRoot = state.apiBase.replace(/\/api\/?$/, "");
  return `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
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
            ${state.notice ? `<span class="status-chip delivered">${escapeHtml(state.notice)}</span>` : ""}
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
    categories: "Categorii Meniu",
    products: "Produse & Video",
    orders: "Comenzi Live",
    account: "Cont",
  }[view];
}

function pageSubtitle(view, restaurant) {
  const name = restaurant?.name || "restaurantul tău";
  return {
    overview: "",
    profile: `Date publice, contact și program pentru ${name}.`,
    categories: `Organizează meniul și secțiunile interne pentru ${name}.`,
    products: `Actualizează produsele, prețurile și clipurile pentru ${name}.`,
    orders: `Monitorizează și actualizează starea comenzilor pentru ${name}.`,
    account: "Detalii despre sesiunea activă și contul owner.",
  }[view];
}

function renderView(view, restaurant, overview) {
  switch (view) {
    case "profile":
      return renderProfileView(restaurant);
    case "categories":
      return renderCategoriesView();
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
  const categories = restaurant.categories_detail || [];
  const completionItems = getProfileCompletionItems(restaurant);
  const completedItems = completionItems.filter((item) => item.done).length;
  const completionPercent = Math.round((completedItems / completionItems.length) * 100);
  const deliveryRange = `${restaurant.estimated_delivery_time_min || 25}-${restaurant.estimated_delivery_time_max || 45} min`;
  const selectedCategoryNames = categories.map((category) => category.name).filter(Boolean);

  return `
    <section class="profile-hero panel">
      <div class="profile-cover-preview">
        ${
          restaurant.cover_image
            ? `<img src="${resolveMediaUrl(restaurant.cover_image)}" alt="Cover ${escapeHtml(restaurant.name || "restaurant")}" />`
            : `<div class="profile-cover-empty"><i class="ri-image-add-line" aria-hidden="true"></i><span>Adaugă cover</span></div>`
        }
        <div class="profile-logo-preview">
          ${
            restaurant.logo
              ? `<img src="${resolveMediaUrl(restaurant.logo)}" alt="Logo ${escapeHtml(restaurant.name || "restaurant")}" />`
              : `<span>${escapeHtml((restaurant.name || "Y").slice(0, 1).toUpperCase())}</span>`
          }
        </div>
      </div>
      <div class="profile-hero-copy">
        <span class="status-chip ${restaurant.is_active ? "delivered" : "cancelled"}">
          <i class="${restaurant.is_active ? "ri-checkbox-circle-line" : "ri-error-warning-line"}" aria-hidden="true"></i>
          ${restaurant.is_active ? "Profil activ" : "Profil inactiv"}
        </span>
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
        <ul>
          ${completionItems
            .map(
              (item) => `
                <li class="${item.done ? "is-done" : ""}">
                  <i class="${item.done ? "ri-checkbox-circle-fill" : "ri-circle-line"}" aria-hidden="true"></i>
                  ${escapeHtml(item.label)}
                </li>
              `,
            )
            .join("")}
        </ul>
      </aside>
    </section>

    <div class="profile-layout">
      <aside class="profile-side-stack">
        <section class="panel profile-summary-card">
          <div class="section-header">
            <div>
              <h2>Pe scurt</h2>
              <small>Ce vede clientul înainte să intre în meniu.</small>
            </div>
          </div>
          <div class="profile-summary-list">
            <span><strong>${escapeHtml(restaurant.entity_type === "brand" ? "Brand" : "Restaurant")}</strong><small>Tip profil</small></span>
            <span><strong>${restaurant.is_open ? "Deschis" : "Închis"}</strong><small>Status curent</small></span>
            <span><strong>${restaurant.supports_pickup ? "Da" : "Nu"}</strong><small>Pickup</small></span>
            <span><strong>${restaurant.is_sponsored ? "Da" : "Nu"}</strong><small>Sponsorizat</small></span>
          </div>
          <div class="pill-row profile-category-pills">
            ${selectedCategoryNames.length ? selectedCategoryNames.map((name) => `<span class="pill">${escapeHtml(name)}</span>`).join("") : `<span class="pill is-muted">Alege categorii publice</span>`}
          </div>
        </section>

        <section class="panel profile-media-card">
          <div class="section-header">
            <div>
              <h2>Media</h2>
              <small>Actualizează rapid identitatea vizuală.</small>
            </div>
          </div>
          ${renderProfileMediaUpload("logo", "Logo", "Iconul rotund din aplicație.", restaurant.logo)}
          ${renderProfileMediaUpload("cover_image", "Cover", "Imaginea mare din profil.", restaurant.cover_image)}
        </section>
      </aside>

      <form id="profile-form" class="profile-form-stack">
        <section class="panel profile-form-card">
          <div class="form-section-title">
            <strong>Informații esențiale</strong>
            <span>Completează întâi numele, orașul, adresa și descrierea. Acestea influențează direct conversia.</span>
          </div>
          <div class="profile-card-fields">
            <div class="split">
              <label class="field"><span>Nume restaurant</span><input name="name" value="${escapeHtml(restaurant.name || "")}" placeholder="Ex: Yumzy Kitchen" required /></label>
              <label class="field"><span>Oraș</span><input name="city" value="${escapeHtml(restaurant.city || "")}" placeholder="Ex: București" required /></label>
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
              <label class="field"><span>Telefon</span><input name="phone" value="${escapeHtml(restaurant.phone || "")}" placeholder="+40..." /></label>
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
            <div class="split">
              <label class="field"><span>Delivery fee</span><input type="number" step="0.01" name="delivery_fee" value="${restaurant.delivery_fee || 0}" /></label>
              <label class="field"><span>Comandă minimă</span><input type="number" step="0.01" name="minimum_order" value="${restaurant.minimum_order || 0}" /></label>
            </div>
            <div class="split">
              <label class="field"><span>Timp livrare minim</span><input type="number" name="estimated_delivery_time_min" value="${restaurant.estimated_delivery_time_min || 25}" /></label>
              <label class="field"><span>Timp livrare maxim</span><input type="number" name="estimated_delivery_time_max" value="${restaurant.estimated_delivery_time_max || 45}" /></label>
            </div>
            <div class="split">
              <label class="field">
                <span>Tip entitate</span>
                <select name="entity_type">
                  <option value="restaurant" ${restaurant.entity_type === "restaurant" ? "selected" : ""}>Restaurant</option>
                  <option value="brand" ${restaurant.entity_type === "brand" ? "selected" : ""}>Brand</option>
                </select>
              </label>
              <label class="field">
                <span>Categorii publice</span>
                <select name="categories" multiple size="5">
                  ${state.restaurantCategories
                    .map(
                      (item) => `
                        <option value="${item.id}" ${categories.some((category) => category.id === item.id) ? "selected" : ""}>
                          ${escapeHtml(item.name)}
                        </option>
                      `,
                    )
                    .join("")}
                </select>
              </label>
            </div>
            <div class="check-card-grid profile-toggle-grid">
              <label class="checkbox-field"><input type="checkbox" name="supports_pickup" ${restaurant.supports_pickup ? "checked" : ""} /><span>Permite pickup</span></label>
              <label class="checkbox-field"><input type="checkbox" name="is_open" ${restaurant.is_open ? "checked" : ""} /><span>Restaurant deschis</span></label>
              <label class="checkbox-field"><input type="checkbox" name="is_active" ${restaurant.is_active ? "checked" : ""} /><span>Profil activ</span></label>
              <label class="checkbox-field"><input type="checkbox" name="is_sponsored" ${restaurant.is_sponsored ? "checked" : ""} /><span>Locație sponsorizată</span></label>
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

        <div class="profile-save-bar">
          <div>
            <strong>Gata de publicat?</strong>
            <span>Salvarea actualizează profilul din aplicația YUMZY.</span>
          </div>
          <button class="button" type="submit"><i class="ri-save-3-line" aria-hidden="true"></i> Salvează profilul</button>
        </div>
      </form>
    </div>
  `;
}

function getProfileCompletionItems(restaurant) {
  return [
    { label: "Nume și adresă", done: Boolean(restaurant.name && restaurant.city && restaurant.address) },
    { label: "Contact public", done: Boolean(restaurant.email || restaurant.phone) },
    { label: "Descriere", done: Boolean((restaurant.description || "").trim()) },
    { label: "Categorii", done: Boolean((restaurant.categories_detail || []).length) },
    { label: "Logo și cover", done: Boolean(restaurant.logo && restaurant.cover_image) },
  ];
}

function renderProfileMediaUpload(fieldName, title, note, imageUrl) {
  return `
    <div class="profile-media-upload">
      ${imageUrl ? `<img class="media-preview" src="${resolveMediaUrl(imageUrl)}" alt="${escapeHtml(title)} restaurant" />` : `<div class="profile-media-empty"><i class="ri-image-line" aria-hidden="true"></i><span>${escapeHtml(title)} lipsă</span></div>`}
      <form class="toolbar" data-media-form="${fieldName}">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(note)}</small>
        </div>
        <input type="file" name="${fieldName}" accept="image/*" required />
        <button class="outline-button" type="submit">Upload</button>
      </form>
    </div>
  `;
}

function renderHoursRows(hours) {
  return DAY_LABELS.map((dayLabel, index) => {
    const entry = hours.find((item) => item.day_of_week === index) || {};
    return `
      <div class="hour-row">
        <strong>${dayLabel}</strong>
        <input type="time" name="opening_time_${index}" value="${(entry.opening_time || "").slice(0, 5)}" ${entry.is_closed ? "disabled" : ""} />
        <input type="time" name="closing_time_${index}" value="${(entry.closing_time || "").slice(0, 5)}" ${entry.is_closed ? "disabled" : ""} />
        <label class="checkbox-field">
          <input type="checkbox" name="is_closed_${index}" ${entry.is_closed ? "checked" : ""} />
          <span>Închis</span>
        </label>
      </div>
    `;
  }).join("");
}

function renderCategoriesView() {
  return `
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>Structură meniu</h2>
          <small>Adaugă categorii interne pentru produse.</small>
        </div>
      </div>
      <form id="category-form" class="category-form">
        <div class="split">
          <label class="field"><span>Nume categorie</span><input name="name" placeholder="Burgeri, Pizza, Desert..." required /></label>
          <label class="field"><span>Ordine</span><input type="number" name="sort_order" value="0" /></label>
        </div>
        <label class="checkbox-field"><input type="checkbox" name="is_active" checked /><span>Categorie activă</span></label>
        <div class="button-row">
          <button class="button" type="submit">${state.editingCategoryId ? "Actualizează categoria" : "Adaugă categoria"}</button>
          ${state.editingCategoryId ? `<button class="ghost-button" type="button" id="cancel-category-edit">Renunță</button>` : ""}
        </div>
      </form>
    </section>
    <section class="categories-grid">
      ${state.productCategories.length
        ? state.productCategories
            .map(
              (category) => `
                <article class="table-card">
                  <div class="section-header">
                    <div>
                      <h2>${escapeHtml(category.name)}</h2>
                      <small>Sort order: ${category.sort_order}</small>
                    </div>
                    <span class="status-chip ${category.is_active ? "delivered" : "cancelled"}">${category.is_active ? "Activă" : "Inactivă"}</span>
                  </div>
                  <div class="button-row">
                    <button class="outline-button" type="button" data-edit-category="${category.id}">Editează</button>
                    <button class="ghost-button" type="button" data-delete-category="${category.id}">Șterge</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : `<article class="empty-card"><h3>Nicio categorie</h3><small>Adaugă prima categorie a meniului.</small></article>`}
    </section>
  `;
}

function renderProductsView() {
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
              <label class="field"><span>Video URL</span><input type="url" name="video_url" placeholder="https://..." /></label>
              <label class="field"><span>Audio URL</span><input type="url" name="audio_url" placeholder="https://..." /></label>
            </div>
            <label class="field"><span>Imagine produs</span><input type="file" name="image" accept="image/*" /></label>
          </div>
        </div>
        <div class="form-section is-compact">
          <div class="form-section-title">
            <strong>Status</strong>
            <span>Controlează vizibilitatea produsului.</span>
          </div>
          <div class="check-card-grid">
            <label class="checkbox-field"><input type="checkbox" name="is_available" checked /><span>Disponibil</span></label>
            <label class="checkbox-field"><input type="checkbox" name="is_popular" /><span>Popular</span></label>
            <label class="checkbox-field"><input type="checkbox" name="has_audio" checked /><span>Are audio</span></label>
          </div>
        </div>
        <div class="button-row">
          <button class="button" type="submit">${state.editingProductId ? "Salvează produsul" : "Adaugă produs"}</button>
          ${state.editingProductId ? `<button class="ghost-button" type="button" id="cancel-product-edit">Renunță</button>` : ""}
        </div>
      </form>
    </section>
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
                      <small>${escapeHtml(product.category_name || "Fără categorie")}</small>
                    </div>
                    <span class="status-chip ${product.is_available ? "delivered" : "cancelled"}">${product.is_available ? "Disponibil" : "Indisponibil"}</span>
                  </div>
                  <div class="price-line">${product.price} RON ${product.discount_price ? `<small>promo ${product.discount_price} RON</small>` : ""}</div>
                  <p>${escapeHtml(product.description || "Fără descriere.")}</p>
                  <div class="pill-row">
                    ${product.video_url ? `<a class="pill" href="${product.video_url}" target="_blank" rel="noreferrer">Video</a>` : ""}
                    ${product.audio_url ? `<a class="pill" href="${product.audio_url}" target="_blank" rel="noreferrer">Audio</a>` : ""}
                    ${product.is_popular ? `<span class="pill">Popular</span>` : ""}
                  </div>
                  <div class="button-row">
                    <button class="outline-button" type="button" data-edit-product="${product.id}">Editează</button>
                    <button class="ghost-button" type="button" data-delete-product="${product.id}">Șterge</button>
                  </div>
                </article>
              `,
            )
            .join("")
        : `<article class="empty-card"><h3>Niciun produs</h3><small>Adaugă primul produs și atașează-i media.</small></article>`}
    </section>
  `;
}

function renderProductMedia(product) {
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
          <label class="field"><span>Oraș</span><input name="city" required /></label>
        </div>
        <label class="field"><span>Adresă</span><input name="address" required /></label>
        <div class="split">
          <label class="field"><span>Email public</span><input type="email" name="email" /></label>
          <label class="field"><span>Telefon</span><input name="phone" /></label>
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
  document.querySelectorAll("[data-media-form]").forEach((form) => form.addEventListener("submit", handleMediaSubmit));
  document.querySelector("#category-form")?.addEventListener("submit", handleCategorySubmit);
  document.querySelector("#cancel-category-edit")?.addEventListener("click", resetCategoryEditing);
  document.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () => startCategoryEdit(Number(button.dataset.editCategory)));
  });
  document.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => deleteCategory(Number(button.dataset.deleteCategory)));
  });

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

function hydrateEditingForms() {
  if (state.editingCategoryId) {
    const category = state.productCategories.find((item) => item.id === state.editingCategoryId);
    if (category) {
      const form = document.querySelector("#category-form");
      if (form) {
        getField(form, "name").value = category.name;
        getField(form, "sort_order").value = category.sort_order;
        getField(form, "is_active").checked = category.is_active;
      }
    }
  }

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
        getField(form, "is_available").checked = Boolean(product.is_available);
        getField(form, "is_popular").checked = Boolean(product.is_popular);
        getField(form, "has_audio").checked = Boolean(product.has_audio);
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
  state.editingCategoryId = null;
  state.editingProductId = null;
  setNotice("Sesiunea a fost închisă.");
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = new FormData(event.currentTarget);
  const categories = Array.from(event.currentTarget.querySelector('[name="categories"]').selectedOptions).map((item) => Number(item.value));
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
        delivery_fee: form.get("delivery_fee") || "0",
        minimum_order: form.get("minimum_order") || "0",
        estimated_delivery_time_min: Number(form.get("estimated_delivery_time_min") || 25),
        estimated_delivery_time_max: Number(form.get("estimated_delivery_time_max") || 45),
        entity_type: form.get("entity_type"),
        supports_pickup: form.get("supports_pickup") === "on",
        is_open: form.get("is_open") === "on",
        is_active: form.get("is_active") === "on",
        is_sponsored: form.get("is_sponsored") === "on",
        categories,
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
  payload.append(fieldName, input.files[0]);

  try {
    const updated = await apiFetch(`restaurant-owner/restaurants/${restaurant.id}/`, {
      method: "PATCH",
      body: payload,
      headers: {},
    });
    replaceRestaurant(updated);
    await fetchOwnerData();
    setNotice("Imaginea a fost actualizată.");
  } catch (error) {
    setError(error.message);
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const restaurant = getSelectedRestaurant();
  if (!restaurant) return;
  const form = new FormData(event.currentTarget);
  const body = {
    restaurant: restaurant.id,
    name: form.get("name"),
    sort_order: Number(form.get("sort_order") || 0),
    is_active: form.get("is_active") === "on",
  };

  try {
    if (state.editingCategoryId) {
      await apiFetch(`restaurant-owner/categories/${state.editingCategoryId}/`, { method: "PATCH", body });
    } else {
      await apiFetch("restaurant-owner/categories/", { method: "POST", body });
    }
    resetCategoryEditing(false);
    await reloadCategories();
    render();
    setNotice("Categoria a fost salvată.");
  } catch (error) {
    setError(error.message);
  }
}

function startCategoryEdit(categoryId) {
  state.editingCategoryId = categoryId;
  render();
}

function resetCategoryEditing(shouldRender = true) {
  state.editingCategoryId = null;
  if (shouldRender) render();
}

async function deleteCategory(categoryId) {
  try {
    await apiFetch(`restaurant-owner/categories/${categoryId}/`, { method: "DELETE" });
    if (state.editingCategoryId === categoryId) resetCategoryEditing(false);
    await reloadCategories();
    render();
    setNotice("Categoria a fost ștearsă.");
  } catch (error) {
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
  formData.append("is_available", String(getField(form, "is_available").checked));
  formData.append("is_popular", String(getField(form, "is_popular").checked));
  formData.append("has_audio", String(getField(form, "has_audio").checked));
  const imageField = getField(form, "image");
  if (imageField.files[0]) formData.append("image", imageField.files[0]);

  try {
    if (state.editingProductId) {
      await apiFetch(`restaurant-owner/products/${state.editingProductId}/`, {
        method: "PATCH",
        body: formData,
        headers: {},
      });
    } else {
      await apiFetch("restaurant-owner/products/", {
        method: "POST",
        body: formData,
        headers: {},
      });
    }
    resetProductEditing(false);
    await reloadProducts();
    render();
    setNotice("Produsul a fost salvat.");
  } catch (error) {
    setError(error.message);
  }
}

function startProductEdit(productId) {
  state.editingProductId = productId;
  render();
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
