import "server-only";
import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";

// Read once at module load and pass as raw data — react-pdf's Image tries to
// `fetch()` a plain path string (which fails for local paths in a Node
// server context), so a Buffer avoids that entirely.
const LOGO_BUFFER = readFileSync(path.join(process.cwd(), "public", "branding", "aeria-logo-mark.png"));

const STATUS_LABEL = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 70, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  billTo: { maxWidth: 260 },
  label: { fontSize: 8, color: "#888888", letterSpacing: 1, marginBottom: 4 },
  clientName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  clientLine: { marginBottom: 1, color: "#333333" },
  logoBlock: { alignItems: "flex-end" },
  logo: { width: 130, height: 98 },
  phone: { fontSize: 8, color: "#888888", marginTop: 6 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
  },
  invoiceTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  invoiceNumber: { fontSize: 10, color: "#666666", marginTop: 3 },
  metaCol: { alignItems: "flex-end" },
  metaLine: { marginBottom: 2, color: "#444444" },
  tripLine: { fontSize: 9, color: "#666666", marginBottom: 16 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f4f1ea",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  colDesc: { flex: 3 },
  colQty: { flex: 0.6, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  th: { fontSize: 8, letterSpacing: 0.5, color: "#888888" },
  totalsBlock: { marginTop: 18, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#666666" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    borderTopStyle: "solid",
  },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  balanceDue: { color: "#b23b3b" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999999",
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    borderTopStyle: "solid",
    paddingTop: 10,
  },
});

export function InvoiceDocument({ invoice }) {
  const balance = invoice.amount - invoice.amountPaid;
  const client = invoice.client;
  const cityLine = [client.city, client.stateProvince, client.postalCode].filter(Boolean).join(", ");

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.billTo}>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={styles.clientName}>
              {client.firstName} {client.lastName}
            </Text>
            {client.primaryEmail && <Text style={styles.clientLine}>{client.primaryEmail}</Text>}
            {client.primaryPhone && <Text style={styles.clientLine}>{client.primaryPhone}</Text>}
            {client.address && <Text style={styles.clientLine}>{client.address}</Text>}
            {cityLine && <Text style={styles.clientLine}>{cityLine}</Text>}
          </View>
          <View style={styles.logoBlock}>
            <Image src={{ data: LOGO_BUFFER, format: "png" }} style={styles.logo} />
            <Text style={styles.phone}>1 888 460-3388</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLine}>Issued: {formatDate(invoice.issueDate)}</Text>
            {invoice.dueDate && <Text style={styles.metaLine}>Due: {formatDate(invoice.dueDate)}</Text>}
            <Text style={styles.metaLine}>Status: {STATUS_LABEL[invoice.status] || invoice.status}</Text>
          </View>
        </View>

        {invoice.trip && (
          <Text style={styles.tripLine}>
            Trip: {invoice.trip.name} — {invoice.trip.destination}
            {invoice.trip.startDate && invoice.trip.endDate
              ? ` (${formatDate(invoice.trip.startDate)} – ${formatDate(invoice.trip.endDate)})`
              : ""}
          </Text>
        )}

        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {invoice.lineItems.map((li) => (
            <View key={li.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDesc}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(li.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(li.quantity * li.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatCurrency(invoice.amount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Amount paid</Text>
            <Text>{formatCurrency(invoice.amountPaid)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Balance due</Text>
            <Text style={[styles.grandTotalValue, balance > 0 && styles.balanceDue]}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for booking with ÆRIA Voyages{invoice.trip ? ` · ${invoice.trip.name}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice) {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
