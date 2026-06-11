const revealItems = document.querySelectorAll(".reveal");
const landingVideos = document.querySelectorAll("video");

const syncAppHeight = () => {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
};

const ensureVideoPlayback = (video) => {
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("autoplay", "");

  if (!video.currentSrc || video.readyState === 0) {
    video.load();
  }

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
  video.addEventListener("canplay", () => ensureVideoPlayback(video));
  video.addEventListener("pause", () => ensureVideoPlayback(video));
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    landingVideos.forEach((video) => ensureVideoPlayback(video));
  }
});

window.addEventListener("focus", () => {
  landingVideos.forEach((video) => ensureVideoPlayback(video));
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
      "Pentru ștergerea contului sau întrebări despre datele tale, contactează-ne la support@yumzy.ro.",
    ],
    link: {
      label: "Vezi versiunea completă: https://yumzy.ro/privacy-policy",
      href: "https://yumzy.ro/privacy-policy/",
    },
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

  if (content.link?.href && content.link?.label) {
    const link = document.createElement("a");
    link.className = "modal-link";
    link.href = content.link.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = content.link.label;
    modalBody.append(link);
  }

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
