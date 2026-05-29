type DateTimeLocale = "ro-RO" | "en-US";

const monthLabels: Record<DateTimeLocale, string[]> = {
  "ro-RO": ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."],
  "en-US": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const pad = (value: number) => String(value).padStart(2, "0");

function fallbackDateTimeFormat(date: Date, locale: DateTimeLocale) {
  const day = date.getDate();
  const month = monthLabels[locale][date.getMonth()] ?? "";
  const year = date.getFullYear();
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return `${day} ${month} ${year}, ${time}`;
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: DateTimeLocale,
  invalidFallback: string,
) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return invalidFallback;

  const DateTimeFormat = globalThis.Intl?.DateTimeFormat;
  if (DateTimeFormat) {
    try {
      return new DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return fallbackDateTimeFormat(date, locale);
    }
  }

  return fallbackDateTimeFormat(date, locale);
}

export function formatShortDateTime(value: string | number | Date | null | undefined, invalidFallback = "") {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return invalidFallback;

  const DateTimeFormat = globalThis.Intl?.DateTimeFormat;
  if (DateTimeFormat) {
    try {
      return new DateTimeFormat("ro-RO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      return `${pad(date.getDate())} ${monthLabels["ro-RO"][date.getMonth()] ?? ""}, ${time}`;
    }
  }

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${pad(date.getDate())} ${monthLabels["ro-RO"][date.getMonth()] ?? ""}, ${time}`;
}
