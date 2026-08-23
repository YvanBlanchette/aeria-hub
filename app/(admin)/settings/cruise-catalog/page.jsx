import { redirect } from "next/navigation";

export default function CruiseCatalogIndexPage() {
	redirect("/settings/cruise-catalog/ships");
}
