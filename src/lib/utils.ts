import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMwk(amount: number) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 0,
  }).format(amount);
}
