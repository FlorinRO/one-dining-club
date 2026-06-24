import { create } from "zustand";

export type AppAlertTone = "info" | "success" | "warning" | "error";
export type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export type AppAlertButton = {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: AppAlertButtonStyle;
};

export type AppAlertOptions = {
  tone?: AppAlertTone;
  dismissible?: boolean;
};

export type AppAlertConfig = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  tone: AppAlertTone;
  dismissible: boolean;
};

type UiState = {
  floatingCartExpanded: boolean;
  appAlert: AppAlertConfig | null;
  setFloatingCartExpanded: (expanded: boolean) => void;
  showAppAlert: (title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) => void;
  hideAppAlert: () => void;
};

let appAlertId = 0;

function inferAlertTone(title: string, buttons: AppAlertButton[], options?: AppAlertOptions): AppAlertTone {
  if (options?.tone) return options.tone;
  if (buttons.some((button) => button.style === "destructive")) return "warning";

  const normalizedTitle = title.toLowerCase();
  if (
    normalizedTitle.includes("eroare") ||
    normalizedTitle.includes("error") ||
    normalizedTitle.includes("nu am putut") ||
    normalizedTitle.includes("could not") ||
    normalizedTitle.includes("indisponibil") ||
    normalizedTitle.includes("unavailable")
  ) {
    return "error";
  }

  return "info";
}

function createAppAlert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions): AppAlertConfig {
  const normalizedButtons = buttons?.length ? buttons : [{ text: "OK" }];
  return {
    id: ++appAlertId,
    title,
    message,
    buttons: normalizedButtons,
    tone: inferAlertTone(title, normalizedButtons, options),
    dismissible: options?.dismissible ?? true,
  };
}

export const useUiStore = create<UiState>((set) => ({
  floatingCartExpanded: false,
  appAlert: null,
  setFloatingCartExpanded: (floatingCartExpanded) => set({ floatingCartExpanded }),
  showAppAlert: (title, message, buttons, options) => set({ appAlert: createAppAlert(title, message, buttons, options) }),
  hideAppAlert: () => set({ appAlert: null }),
}));

export function showAppAlert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) {
  useUiStore.getState().showAppAlert(title, message, buttons, options);
}

export function hideAppAlert() {
  useUiStore.getState().hideAppAlert();
}
