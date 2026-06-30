const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const GOOGLE_MAPS_API_KEY =
  new URLSearchParams(window.location.search).get("googleMapsApiKey") ||
  window.YUMZY_DASHBOARD_CONFIG?.googleMapsApiKey ||
  "";

let googleMapsPlacesApiPromise = null;

const resolveApiBase = () => {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("apiBase") || params.get("api");
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  if (LOCAL_HOSTS.has(window.location.hostname)) {
    return "http://127.0.0.1:8000/api";
  }
  return "https://api.yumzy.ro/api";
};

const form = document.querySelector("#restaurant-application-form");
const statusNode = document.querySelector("#partner-status");
const apiBase = resolveApiBase();

const setStatus = (message, tone = "") => {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.remove("is-success", "is-error");
  if (tone) {
    statusNode.classList.add(tone);
  }
};

const modalContent = {
  terms: {
    title: "Termeni și condiții",
    paragraphs: [
      "Prin folosirea YUMZY, ești de acord să utilizezi aplicația responsabil și doar pentru comenzi, descoperirea restaurantelor și interacțiuni legitime cu serviciul.",
      "Informațiile despre restaurante, produse, prețuri și disponibilitate pot fi actualizate periodic. Comenzile, plățile și livrările sunt procesate conform condițiilor afișate în aplicație la momentul folosirii.",
      "Ne rezervăm dreptul de a actualiza acești termeni pentru a reflecta schimbări ale serviciului, cerințe legale sau îmbunătățiri operaționale.",
    ],
  },
  contact: {
    title: "Contact",
    paragraphs: [
      "Pentru întrebări despre cont, comenzi, plăți, restaurante sau suport tehnic, ne poți scrie la support@yumzy.ro.",
      "Revenim cât mai rapid cu un răspuns și detalii despre pașii următori.",
    ],
  },
};

const infoModal = document.querySelector("#info-modal");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const modalClose = document.querySelector(".modal-close");
const modalButtons = document.querySelectorAll("[data-modal-topic]");
const footer = document.querySelector(".site-footer");

const openInfoModal = (topic) => {
  const content = modalContent[topic];
  if (!content || !infoModal || !modalTitle || !modalBody) return;

  modalTitle.textContent = content.title;
  modalBody.replaceChildren();

  content.paragraphs.forEach((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    modalBody.append(paragraph);
  });

  infoModal.showModal();
};

const formatCoordinate = (value) => Number(value).toFixed(6);

const inferCityFromPlace = (place) => {
  const components = place?.address_components || [];
  const priorityTypes = [
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_1",
  ];

  for (const type of priorityTypes) {
    const component = components.find((entry) => entry.types?.includes(type));
    if (component?.long_name) {
      return component.long_name;
    }
  }
  return "";
};

const loadGoogleMapsPlacesApi = () => {
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (googleMapsPlacesApiPromise) return googleMapsPlacesApiPromise;
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Autocomplete-ul pentru adresă este oprit: lipsește cheia Google Maps."));
  }

  googleMapsPlacesApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.async = true;
    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve(window.google.maps);
        return;
      }
      reject(new Error("Google Maps Places nu a putut fi încărcat."));
    };
    script.onerror = () => reject(new Error("Google Maps Places nu a putut fi încărcat."));
    document.head.appendChild(script);
  });

  return googleMapsPlacesApiPromise;
};

const bindGoogleAddressAutocomplete = () => {
  const addressInput = document.querySelector("[data-google-address-input]");
  if (!addressInput) return;

  loadGoogleMapsPlacesApi()
    .then(() => {
      if (addressInput.dataset.googleAutocompleteBound === "true") return;
      addressInput.dataset.googleAutocompleteBound = "true";

      const cityInput = form?.querySelector('[name="city"]');
      const hiddenAddressInput = form?.querySelector('[name="address"]');
      const latitudeInput = form?.querySelector('[name="latitude"]');
      const longitudeInput = form?.querySelector('[name="longitude"]');

      const autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
        fields: ["formatted_address", "address_components", "geometry"],
        types: ["address"],
        componentRestrictions: { country: "ro" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place) return;

        const formattedAddress = place.formatted_address || addressInput.value.trim();
        const city = inferCityFromPlace(place);
        const latitude = place.geometry?.location?.lat?.();
        const longitude = place.geometry?.location?.lng?.();

        addressInput.value = formattedAddress;
        if (hiddenAddressInput) hiddenAddressInput.value = formattedAddress;
        if (cityInput) cityInput.value = city;
        if (latitudeInput && Number.isFinite(latitude)) latitudeInput.value = formatCoordinate(latitude);
        if (longitudeInput && Number.isFinite(longitude)) longitudeInput.value = formatCoordinate(longitude);
      });
    })
    .catch((error) => {
      setStatus(error.message, "is-error");
    });
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Trimitem cererea...");

  const locationInput = form.querySelector('[name="location_address"]');
  const hiddenAddressInput = form.querySelector('[name="address"]');
  if (locationInput && hiddenAddressInput && !hiddenAddressInput.value.trim()) {
    hiddenAddressInput.value = locationInput.value.trim();
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  delete payload.location_address;

  if (!payload.address) {
    setStatus("Selectează o adresă validă din sugestiile Google.", "is-error");
    return;
  }

  if (!payload.city) {
    setStatus("Nu am putut identifica orașul din adresă. Alege o sugestie completă.", "is-error");
    return;
  }

  try {
    const response = await fetch(`${apiBase}/restaurant-applications/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const firstError = Object.values(data)[0];
      const errorText = Array.isArray(firstError) ? firstError[0] : firstError || "Nu am putut trimite cererea.";
      setStatus(String(errorText), "is-error");
      return;
    }

    form.reset();
    setStatus(
      data.detail || "Cererea a fost trimisă. Vei primi pe email confirmarea de primire.",
      "is-success",
    );
  } catch (_error) {
    setStatus("Nu am putut trimite cererea. Încearcă din nou în câteva minute.", "is-error");
  }
});

modalButtons.forEach((button) => {
  button.addEventListener("click", () => openInfoModal(button.dataset.modalTopic));
});

modalClose?.addEventListener("click", () => infoModal?.close());

infoModal?.addEventListener("click", (event) => {
  if (event.target === infoModal) {
    infoModal.close();
  }
});

if (footer) {
  footer.classList.add("is-visible");
}

bindGoogleAddressAutocomplete();
