import { formatShortDateTime } from "./dateFormat";

export const money = (value: string | number) => `${Number(value).toFixed(2).replace(".", ",")} lei`;

export const deliveryWindow = (min: number, max: number) => `${min}-${max} min`;

export const shortDate = (value: string) => formatShortDateTime(value);
