import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
	page: {
		paddingTop: 34,
		paddingHorizontal: 32,
		paddingBottom: 42,
		fontSize: 10,
		color: "#12212f",
		fontFamily: "Helvetica",
	},
	header: {
		marginBottom: 20,
	},
	title: {
		fontSize: 20,
		fontFamily: "Helvetica-Bold",
		color: "#0d2b45",
	},
	subtitle: {
		marginTop: 3,
		color: "#4c6172",
		fontSize: 9,
	},
	sectionTitle: {
		fontFamily: "Helvetica-Bold",
		marginTop: 12,
		marginBottom: 6,
		fontSize: 11,
		color: "#0d2b45",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		borderBottomWidth: 1,
		borderBottomColor: "#e5ebf0",
		borderBottomStyle: "solid",
		paddingVertical: 4,
	},
	rowLabel: {
		color: "#4c6172",
		width: "60%",
	},
	rowValue: {
		color: "#0d2b45",
		width: "40%",
		textAlign: "right",
	},
	card: {
		borderWidth: 1,
		borderColor: "#d8e2e9",
		borderStyle: "solid",
		borderRadius: 8,
		padding: 10,
		marginTop: 8,
	},
	foot: {
		position: "absolute",
		bottom: 18,
		left: 32,
		right: 32,
		textAlign: "center",
		color: "#6c8191",
		fontSize: 8,
	},
});

function money(v) {
	const n = Number(v) || 0;
	return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);
}

function dt(d) {
	if (!d) return "-";
	return new Date(d).toLocaleDateString("fr-CA");
}

function ForfaitDocument({ payload }) {
	const rows = Array.isArray(payload?.resultRows) ? payload.resultRows : [];
	const summary = payload?.summary || {};
	const base = payload?.base || {};
	const draft = payload?.draft || {};

	return (
		<Document title={`Forfait ${draft.projectName || "AERIA"}`}>
			<Page
				size="LETTER"
				style={styles.page}
			>
				<View style={styles.header}>
					<Text style={styles.title}>Soumission forfait croisiere</Text>
					<Text style={styles.subtitle}>AERIA Hub · genere le {dt(new Date())}</Text>
					<Text style={styles.subtitle}>{draft.projectName || "Projet sans titre"}</Text>
				</View>

				<Text style={styles.sectionTitle}>Contexte voyage</Text>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Compagnie / navire</Text>
					<Text style={styles.rowValue}>{[draft.compagnie, draft.navire].filter(Boolean).join(" - ") || "-"}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Itineraire</Text>
					<Text style={styles.rowValue}>{[draft.portDepart, draft.portArrivee].filter(Boolean).join(" -> ") || "-"}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Dates croisiere</Text>
					<Text style={styles.rowValue}>{draft.croisiereDebut && draft.croisiereFin ? `${dt(draft.croisiereDebut)} au ${dt(draft.croisiereFin)}` : "-"}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Passagers / nuits totales</Text>
					<Text style={styles.rowValue}>{`${base.pax || 0} pax / ${base.totalNuits || 0} nuits`}</Text>
				</View>

				<Text style={styles.sectionTitle}>Prix par categorie</Text>
				{rows.length === 0 ? (
					<Text style={styles.subtitle}>Aucune categorie active.</Text>
				) : (
					rows.map((row) => (
						<View
							key={row.id}
							style={styles.card}
						>
							<View style={styles.row}>
								<Text style={styles.rowLabel}>{row.label}</Text>
								<Text style={styles.rowValue}>{row.id}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.rowLabel}>Prix par personne</Text>
								<Text style={styles.rowValue}>{money(row?.calc?.prixPers)}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.rowLabel}>Prix par personne / nuit</Text>
								<Text style={styles.rowValue}>{money(row?.calc?.prixPersNuit)}</Text>
							</View>
							<View style={styles.row}>
								<Text style={styles.rowLabel}>Total groupe</Text>
								<Text style={styles.rowValue}>{money(row?.calc?.total)}</Text>
							</View>
						</View>
					))
				)}

				<Text style={styles.sectionTitle}>Synthese commerciale</Text>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Vente estimee (multi-categories)</Text>
					<Text style={styles.rowValue}>{money(summary.totalVente)}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Revenu estime (multi-categories)</Text>
					<Text style={styles.rowValue}>{money(summary.totalRevenu)}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Marge moyenne</Text>
					<Text style={styles.rowValue}>{`${Number(summary.margeMoy || 0).toFixed(1)} %`}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.rowLabel}>Sante marge</Text>
					<Text style={styles.rowValue}>{summary.health || "-"}</Text>
				</View>

				{draft.notes ? (
					<>
						<Text style={styles.sectionTitle}>Notes internes</Text>
						<Text>{String(draft.notes)}</Text>
					</>
				) : null}

				<Text style={styles.foot}>Document genere depuis AERIA Hub · Donnees sujettes aux variations de disponibilite et de tarifs.</Text>
			</Page>
		</Document>
	);
}

export async function renderForfaitPdf(payload) {
	return renderToBuffer(<ForfaitDocument payload={payload} />);
}
