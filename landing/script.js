const revealItems = document.querySelectorAll(".reveal");
const landingVideos = document.querySelectorAll("video");

const syncAppHeight = () => {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
};

const ensureVideoPlayback = (video) => {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      // Browser policy may still delay playback until first user gesture.
    });
  }
};

syncAppHeight();
window.addEventListener("resize", syncAppHeight);
window.addEventListener("orientationchange", syncAppHeight);
window.addEventListener("pageshow", syncAppHeight);

landingVideos.forEach((video) => {
  ensureVideoPlayback(video);
  video.addEventListener("loadedmetadata", () => ensureVideoPlayback(video), { once: true });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 },
);

revealItems.forEach((item) => revealObserver.observe(item));

const form = document.querySelector(".waitlist-form");
const note = document.querySelector(".form-note");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(form).get("email");
  note.textContent = email
    ? `Email salvat local pentru demo: ${email}. Conectăm formularul la backend când API-ul este gata.`
    : "Introdu un email valid.";
  form.reset();
});

const modalContent = {
  terms: {
    title: "Termeni și condiții",
    paragraphs: [
      "Prin folosirea YUMZY, ești de acord să utilizezi aplicația responsabil și doar pentru comenzi, descoperirea restaurantelor și interacțiuni legitime cu serviciul.",
      "Informațiile despre restaurante, produse, prețuri și disponibilitate pot fi actualizate periodic. Comenzile, plățile și livrările sunt procesate conform condițiilor afișate în aplicație la momentul folosirii.",
      "Ne rezervăm dreptul de a actualiza acești termeni pentru a reflecta schimbări ale serviciului, cerințe legale sau îmbunătățiri operaționale.",
    ],
  },
  privacy: {
    title: "Politica de confidențialitate",
    paragraphs: [
      "YUMZY folosește datele contului pentru funcții esențiale precum autentificare, livrare, istoricul comenzilor și suport.",
      "Putem folosi preferințele, locația de livrare și activitatea din aplicație pentru a îmbunătăți recomandările și experiența de comandă.",
      "Pentru ștergerea contului sau întrebări despre datele tale, contactează-ne la support@onedining.club.",
    ],
  },
  contact: {
    title: "Contact",
    paragraphs: [
      "Pentru întrebări despre cont, comenzi, plăți, restaurante sau suport tehnic, ne poți scrie la support@onedining.club.",
      "Revenim cât mai rapid cu un răspuns și detalii despre pașii următori.",
    ],
  },
};

const infoModal = document.querySelector("#info-modal");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const modalClose = document.querySelector(".modal-close");
const modalButtons = document.querySelectorAll("[data-modal-topic]");

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

modalButtons.forEach((button) => {
  button.addEventListener("click", () => openInfoModal(button.dataset.modalTopic));
});

modalClose?.addEventListener("click", () => infoModal?.close());

infoModal?.addEventListener("click", (event) => {
  if (event.target === infoModal) {
    infoModal.close();
  }
});

const footer = document.querySelector(".site-footer");
const bottomThreshold = 8;

const syncFooterVisibility = () => {
  if (!footer) return;
  const scrollBottom = window.scrollY + window.innerHeight;
  const pageBottom = document.documentElement.scrollHeight;
  const isAtBottom = scrollBottom >= pageBottom - bottomThreshold;
  footer.classList.toggle("is-visible", isAtBottom);
};

window.addEventListener("scroll", syncFooterVisibility, { passive: true });
window.addEventListener("resize", syncFooterVisibility);
syncFooterVisibility();
