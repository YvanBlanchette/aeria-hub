import { Plane, BedDouble, Ship, Map, Car, CarFront, ShieldCheck, MoreHorizontal } from "lucide-react";

/** Supplier categories available in the Suppliers directory, in display order. */
export const SUPPLIER_CATEGORIES = [
  { value: "AIRLINE", label: "Airline", icon: Plane },
  { value: "CRUISE", label: "Cruise", icon: Ship },
  { value: "HOTEL", label: "Hotel", icon: BedDouble },
  { value: "TOUR_OPERATOR", label: "Tour Operator", icon: Map },
  { value: "CAR_RENTAL", label: "Car Rental", icon: CarFront },
  { value: "INSURANCE", label: "Insurance", icon: ShieldCheck },
  { value: "TRANSFER", label: "Transfer", icon: Car },
  { value: "OTHER", label: "Other", icon: MoreHorizontal },
];

export const SUPPLIER_CATEGORY_MAP = Object.fromEntries(SUPPLIER_CATEGORIES.map((c) => [c.value, c]));
