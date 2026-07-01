export function formatMoney(value: string | number) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) {
    return "0 RON";
  }

  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function titleCaseVehicle(vehicleType: string) {
  return {
    bike: "Bike",
    scooter: "Scooter",
    car: "Car",
    walk: "Walk",
  }[vehicleType] ?? vehicleType;
}
