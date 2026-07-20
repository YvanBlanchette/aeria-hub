import { Plane, BedDouble, Ship, Map, Car, Compass, CarFront, ShieldCheck, MoreHorizontal } from "lucide-react";

/** Segment types available in the itinerary builder, in display order. */
export const SEGMENT_TYPES = [
  { value: "FLIGHT", label: "Flight", icon: Plane },
  { value: "HOTEL", label: "Hotel", icon: BedDouble },
  { value: "CRUISE", label: "Cruise", icon: Ship },
  { value: "CIRCUIT", label: "Circuit", icon: Map },
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
  CIRCUIT: [
    { key: "duration", label: "Duration", type: "text", placeholder: "7 days, 10 days..." },
    { key: "startCity", label: "Start city", type: "text" },
    { key: "endCity", label: "End city", type: "text" },
    { key: "includes", label: "Includes", type: "textarea" },
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

function utcDateKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function utcMidnight(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Groups segments (expected pre-sorted by sortOrder) into day-by-day
 * buckets spanning the trip's date range, plus an "Unscheduled" bucket for
 * segments with no startDateTime or outside the trip's range. Segment order
 * within each bucket is preserved from the input array — this is what
 * reorderSegment operates on, so the page and the reorder action must both
 * go through this function to stay in sync.
 * @param {object[]} segments
 * @param {{ startDate?: Date | null, endDate?: Date | null }} trip
 */
export function groupSegmentsByDay(segments, trip) {
  const scheduled = segments.filter((s) => s.startDateTime);
  const unscheduled = segments.filter((s) => !s.startDateTime);

  const days = [];
  if (trip?.startDate && trip?.endDate) {
    const cursor = utcMidnight(trip.startDate);
    const endDay = utcMidnight(trip.endDate);
    let dayNum = 1;
    const dayKeys = new Set();
    while (cursor <= endDay) {
      const key = utcDateKey(cursor);
      dayKeys.add(key);
      days.push({
        key,
        label: `Day ${dayNum}`,
        date: new Date(cursor),
        segments: scheduled.filter((s) => utcDateKey(s.startDateTime) === key),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      dayNum++;
    }
    unscheduled.push(...scheduled.filter((s) => !dayKeys.has(utcDateKey(s.startDateTime))));
  } else if (scheduled.length > 0) {
    const uniqueKeys = [...new Set(scheduled.map((s) => utcDateKey(s.startDateTime)))];
    uniqueKeys.forEach((key, i) => {
      const daySegments = scheduled.filter((s) => utcDateKey(s.startDateTime) === key);
      days.push({ key, label: `Day ${i + 1}`, date: daySegments[0].startDateTime, segments: daySegments });
    });
  }

  return { days, unscheduled };
}

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
    case "CIRCUIT":
      if (details.startCity && details.endCity) {
        parts.push(`${details.startCity} → ${details.endCity}`);
      }
      if (details.duration) parts.push(details.duration);
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
