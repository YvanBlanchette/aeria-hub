/**
 * Field mapping between our Client model and the two contact CSV shapes
 * people actually export: Google Contacts' "Google CSV" and the
 * "Outlook CSV" format (which Google Contacts can also export directly,
 * and which real Outlook/other address books use too).
 */

export const GOOGLE_HEADERS = [
  "Name",
  "Given Name",
  "Family Name",
  "Birthday",
  "Notes",
  "E-mail 1 - Type",
  "E-mail 1 - Value",
  "E-mail 2 - Type",
  "E-mail 2 - Value",
  "Phone 1 - Type",
  "Phone 1 - Value",
  "Phone 2 - Type",
  "Phone 2 - Value",
  "Address 1 - Type",
  "Address 1 - Street",
  "Address 1 - City",
  "Address 1 - Region",
  "Address 1 - Postal Code",
  "Address 1 - Country",
];

export const OUTLOOK_HEADERS = [
  "First Name",
  "Last Name",
  "Birthday",
  "Notes",
  "E-mail Address",
  "E-mail 2 Address",
  "Mobile Phone",
  "Home Phone",
  "Home Street",
  "Home City",
  "Home State",
  "Home Postal Code",
  "Home Country/Region",
];

function isoDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

function buildNotes(client) {
  const parts = [];
  if (client.travelPreferences) parts.push(`Travel preferences: ${client.travelPreferences}`);
  if (client.dietaryNotes) parts.push(`Dietary/medical: ${client.dietaryNotes}`);
  if (client.mobilityNotes) parts.push(`Mobility: ${client.mobilityNotes}`);
  return parts.join(" | ");
}

/** @param {object} client */
export function buildGoogleRow(client) {
  return {
    Name: `${client.firstName} ${client.lastName}`.trim(),
    "Given Name": client.firstName || "",
    "Family Name": client.lastName || "",
    Birthday: isoDate(client.dateOfBirth),
    Notes: buildNotes(client),
    "E-mail 1 - Type": client.primaryEmail ? "* Home" : "",
    "E-mail 1 - Value": client.primaryEmail || "",
    "E-mail 2 - Type": client.secondaryEmail ? "Home" : "",
    "E-mail 2 - Value": client.secondaryEmail || "",
    "Phone 1 - Type": client.primaryPhone ? "* Mobile" : "",
    "Phone 1 - Value": client.primaryPhone || "",
    "Phone 2 - Type": client.secondaryPhone ? "Home" : "",
    "Phone 2 - Value": client.secondaryPhone || "",
    "Address 1 - Type": client.address || client.city ? "* Home" : "",
    "Address 1 - Street": client.address || "",
    "Address 1 - City": client.city || "",
    "Address 1 - Region": client.stateProvince || "",
    "Address 1 - Postal Code": client.postalCode || "",
    "Address 1 - Country": client.country || "",
  };
}

/** @param {object} client */
export function buildOutlookRow(client) {
  return {
    "First Name": client.firstName || "",
    "Last Name": client.lastName || "",
    Birthday: isoDate(client.dateOfBirth),
    Notes: buildNotes(client),
    "E-mail Address": client.primaryEmail || "",
    "E-mail 2 Address": client.secondaryEmail || "",
    "Mobile Phone": client.primaryPhone || "",
    "Home Phone": client.secondaryPhone || "",
    "Home Street": client.address || "",
    "Home City": client.city || "",
    "Home State": client.stateProvince || "",
    "Home Postal Code": client.postalCode || "",
    "Home Country/Region": client.country || "",
  };
}

/** @param {string[]} headers */
export function detectCsvFormat(headers) {
  const set = new Set(headers);
  if (set.has("Given Name") && set.has("Family Name")) return "google";
  if (set.has("First Name") && set.has("Last Name")) return "outlook";
  return null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Record<string,string>} row
 * @param {"google" | "outlook"} format
 */
export function mapRowToClient(row, format) {
  const get = (key) => (row[key] ?? "").trim() || null;

  if (format === "google") {
    const name = get("Name");
    return {
      firstName: get("Given Name") || name?.split(" ")[0] || "",
      lastName: get("Family Name") || (name ? name.split(" ").slice(1).join(" ") : "") || "",
      primaryEmail: get("E-mail 1 - Value"),
      secondaryEmail: get("E-mail 2 - Value"),
      primaryPhone: get("Phone 1 - Value"),
      secondaryPhone: get("Phone 2 - Value"),
      address: get("Address 1 - Street"),
      city: get("Address 1 - City"),
      stateProvince: get("Address 1 - Region"),
      postalCode: get("Address 1 - Postal Code"),
      country: get("Address 1 - Country"),
      dateOfBirth: parseDate(get("Birthday")),
      note: get("Notes"),
    };
  }

  if (format === "outlook") {
    const primaryPhone = get("Mobile Phone") || get("Primary Phone") || get("Home Phone") || get("Business Phone");
    const secondaryCandidate = get("Home Phone") || get("Business Phone");
    return {
      firstName: get("First Name") || "",
      lastName: get("Last Name") || "",
      primaryEmail: get("E-mail Address"),
      secondaryEmail: get("E-mail 2 Address"),
      primaryPhone,
      secondaryPhone: secondaryCandidate && secondaryCandidate !== primaryPhone ? secondaryCandidate : null,
      address: get("Home Street") || get("Business Street"),
      city: get("Home City") || get("Business City"),
      stateProvince: get("Home State") || get("Business State"),
      postalCode: get("Home Postal Code") || get("Business Postal Code"),
      country: get("Home Country/Region") || get("Business Country/Region"),
      dateOfBirth: parseDate(get("Birthday")),
      note: get("Notes"),
    };
  }

  return null;
}
