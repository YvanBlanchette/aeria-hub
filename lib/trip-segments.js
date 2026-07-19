import { Plane, BedDouble, Ship, Car, Compass, CarFront, ShieldCheck, MoreHorizontal } from "lucide-react";

/** Segment types available in the itinerary builder, in display order. */
export const SEGMENT_TYPES = [
  { value: "FLIGHT", label: "Flight", icon: Plane },
  { value: "HOTEL", label: "Hotel", icon: BedDouble },
  { value: "CRUISE", label: "Cruise", icon: Ship },
  { value: "TRANSFER", label: "Transfer", icon: Car },
  { value: "EXCURSION", label: "Excursion", icon: Compass },
  { value: "CAR_RENTAL", label: "Car Rental", icon: CarFront },
  { value: "INSURANCE", label: "Insurance", icon: ShieldCheck },
  { value: "OTHER", label: "Other", icon: MoreHorizontal },
];

export const SEGMENT_TYPE_MAP = Object.fromEntries(SEGMENT_TYPES.map((t) => [t.value, t]));

/**
 * Type-specific fields stored in TripSegment.details (JSON). Fields common
 * to every segment (title, provider, confirmation number, dates, location,
 * cost, notes) live as real columns instead.
 */
export const SEGMENT_DETAIL_FIELDS = {
  FLIGHT: [
    { key: "flightNumber", label: "Flight number", type: "text" },
    { key: "departureAirport", label: "Departure airport", type: "text", placeholder: "YUL" },
    { key: "arrivalAirport", label: "Arrival airport", type: "text", placeholder: "CDG" },
    { key: "seatClass", label: "Class", type: "text", placeholder: "Economy, Business..." },
    { key: "seatNumber", label: "Seat", type: "text" },
    { key: "baggageAllowance", label: "Baggage allowance", type: "text" },
  ],
  HOTEL: [
    { key: "roomType", label: "Room type", type: "text" },
    { key: "boardType", label: "Board type", type: "text", placeholder: "Room only, Breakfast, All-inclusive..." },
    { key: "numberOfRooms", label: "Number of rooms", type: "number" },
  ],
  CRUISE: [
    { key: "shipName", label: "Ship name", type: "text" },
    { key: "cabinNumber", label: "Cabin number", type: "text" },
    { key: "cabinType", label: "Cabin type", type: "text", placeholder: "Interior, Ocean view, Balcony, Suite..." },
    { key: "departurePort", label: "Departure port", type: "text" },
    { key: "arrivalPort", label: "Arrival port", type: "text" },
  ],
  TRANSFER: [
    { key: "transferType", label: "Transfer type", type: "text", placeholder: "Airport → Hotel..." },
    { key: "vehicleType", label: "Vehicle type", type: "text" },
    { key: "pickupLocation", label: "Pickup location", type: "text" },
    { key: "dropoffLocation", label: "Drop-off location", type: "text" },
  ],
  EXCURSION: [
    { key: "meetingPoint", label: "Meeting point", type: "text" },
    { key: "duration", label: "Duration", type: "text", placeholder: "3 hours, half-day..." },
    { key: "includes", label: "Includes", type: "textarea" },
  ],
  CAR_RENTAL: [
    { key: "carType", label: "Car type", type: "text" },
    { key: "driverName", label: "Driver name", type: "text" },
    { key: "pickupLocation", label: "Pickup location", type: "text" },
    { key: "dropoffLocation", label: "Drop-off location", type: "text" },
  ],
  INSURANCE: [
    { key: "coverageType", label: "Coverage type", type: "text", placeholder: "Trip cancellation, Medical, All-in..." },
    { key: "coverageAmount", label: "Coverage amount", type: "text" },
  ],
  OTHER: [],
};

/** Short "chip" summary of the most useful detail fields for compact display. */
export function summarizeSegmentDetails(type, details) {
  if (!details) return null;
  const parts = [];
  switch (type) {
    case "FLIGHT":
      if (details.departureAirport && details.arrivalAirport) {
        parts.push(`${details.departureAirport} → ${details.arrivalAirport}`);
      }
      if (details.flightNumber) parts.push(details.flightNumber);
      if (details.seatClass) parts.push(details.seatClass);
      break;
    case "HOTEL":
      if (details.roomType) parts.push(details.roomType);
      if (details.boardType) parts.push(details.boardType);
      break;
    case "CRUISE":
      if (details.shipName) parts.push(details.shipName);
      if (details.cabinType) parts.push(details.cabinType);
      break;
    case "TRANSFER":
      if (details.pickupLocation && details.dropoffLocation) {
        parts.push(`${details.pickupLocation} → ${details.dropoffLocation}`);
      }
      break;
    case "CAR_RENTAL":
      if (details.carType) parts.push(details.carType);
      break;
    case "INSURANCE":
      if (details.coverageType) parts.push(details.coverageType);
      break;
    default:
      break;
  }
  return parts.length ? parts.join(" · ") : null;
}
