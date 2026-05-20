import { AppLanguage } from "../store/preferencesStore";

type Dictionary = Record<string, string>;

const ro: Dictionary = {
  "tabs.home": "Feed",
  "tabs.search": "Căutare",
  "tabs.cart": "Coș",
  "tabs.orders": "Comenzi",
  "tabs.profile": "Profil",

  "settings.title": "Setări",
  "settings.language": "Limbă",
  "settings.language.ro": "Română",
  "settings.language.en": "Engleză",
  "settings.language.alert.title": "Limba aplicației",
  "settings.language.alert.message": "Alege limba preferată:",
  "settings.cancel": "Anulează",
  "settings.logout": "Delogare",
  "settings.loggingOut": "Se deloghează...",
  "settings.logout.title": "Delogare",
  "settings.logout.message": "Vrei să ieși din cont?",
  "settings.delete": "Șterge cont",
  "settings.delete.title": "Șterge contul",
  "settings.delete.message": "Ștergerea automată nu este disponibilă încă în backend. Pentru moment te putem deloga, iar ștergerea finală se face prin suport.",

  "profile.others.settings": "Setări",
  "profile.others.privacy": "Confidențialitate",
  "profile.others.about": "Despre",
  "profile.others.support": "Suport",

  "info.privacy.title": "Confidențialitate",
  "info.about.title": "Despre ONE Dining Club",
  "info.support.title": "Suport",

  "status.pending": "Plasată",
  "status.accepted": "Acceptată",
  "status.preparing": "În preparare",
  "status.ready": "Gata",
  "status.picked_up": "Ridicată",
  "status.on_the_way": "În livrare",
  "status.delivered": "Livrată",
  "status.cancelled": "Anulată",
  "status.rejected": "Respinsă",
};

const en: Dictionary = {
  "tabs.home": "Feed",
  "tabs.search": "Search",
  "tabs.cart": "Cart",
  "tabs.orders": "Orders",
  "tabs.profile": "Profile",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.language.ro": "Romanian",
  "settings.language.en": "English",
  "settings.language.alert.title": "App language",
  "settings.language.alert.message": "Choose your preferred language:",
  "settings.cancel": "Cancel",
  "settings.logout": "Log out",
  "settings.loggingOut": "Logging out...",
  "settings.logout.title": "Log out",
  "settings.logout.message": "Do you want to log out?",
  "settings.delete": "Delete account",
  "settings.delete.title": "Delete account",
  "settings.delete.message": "Automatic deletion is not available in backend yet. For now we can log you out, and final deletion is handled by support.",

  "profile.others.settings": "Settings",
  "profile.others.privacy": "Privacy",
  "profile.others.about": "About",
  "profile.others.support": "Support",

  "info.privacy.title": "Privacy",
  "info.about.title": "About ONE Dining Club",
  "info.support.title": "Support",

  "status.pending": "Placed",
  "status.accepted": "Accepted",
  "status.preparing": "Preparing",
  "status.ready": "Ready",
  "status.picked_up": "Picked up",
  "status.on_the_way": "On the way",
  "status.delivered": "Delivered",
  "status.cancelled": "Cancelled",
  "status.rejected": "Rejected",
};

const dictionaries: Record<AppLanguage, Dictionary> = { ro, en };

export function translate(language: AppLanguage, key: string, fallback?: string): string {
  return dictionaries[language][key] ?? dictionaries.ro[key] ?? fallback ?? key;
}
