export const money = (value: string | number) => `${Number(value).toFixed(2)} lei`;

export const deliveryWindow = (min: number, max: number) => `${min}-${max} min`;

export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

