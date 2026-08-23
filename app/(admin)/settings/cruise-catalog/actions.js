"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";

function readText(formData, name) {
	const value = formData.get(name);
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readFloat(formData, name) {
	const value = formData.get(name);
	if (typeof value !== "string" || value.trim() === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

// CRUISE SHIPS

export async function createCruiseShip(prevState, formData) {
	const user = await requireAdmin();
	const name = readText(formData, "name");
	if (!name) return "Ship name is required.";

	try {
		const ship = await prisma.cruiseShip.create({
			data: { name, supplierId: readText(formData, "supplierId") },
		});
		await logActivity({ entityType: "CruiseShip", entityId: ship.id, action: "created", description: `Cruise ship "${ship.name}" created`, userId: user.id });
	} catch (error) {
		if (error?.code === "P2002") return "A ship with this name already exists for that cruise line.";
		console.error("createCruiseShip failed", error);
		return "Unable to create the ship right now.";
	}

	revalidatePath("/settings/cruise-catalog/ships");
}

export async function updateCruiseShip(shipId, prevState, formData) {
	const user = await requireAdmin();
	const name = readText(formData, "name");
	if (!name) return "Ship name is required.";

	try {
		const ship = await prisma.cruiseShip.update({
			where: { id: shipId },
			data: { name, supplierId: readText(formData, "supplierId") },
		});
		await logActivity({ entityType: "CruiseShip", entityId: ship.id, action: "updated", description: `Cruise ship "${ship.name}" updated`, userId: user.id });
	} catch (error) {
		if (error?.code === "P2002") return "A ship with this name already exists for that cruise line.";
		console.error("updateCruiseShip failed", error);
		return "Unable to update the ship right now.";
	}

	revalidatePath("/settings/cruise-catalog/ships");
}

export async function deleteCruiseShip(shipId) {
	const user = await requireAdmin();
	const ship = await prisma.cruiseShip.findUnique({ where: { id: shipId } });
	if (!ship) return;

	await prisma.cruiseShip.delete({ where: { id: shipId } });
	await logActivity({ entityType: "CruiseShip", entityId: shipId, action: "deleted", description: `Cruise ship "${ship.name}" deleted`, userId: user.id });
	revalidatePath("/settings/cruise-catalog/ships");
}

// CRUISE PORTS

function readPortFields(formData) {
	return {
		name: readText(formData, "name"),
		displayText: readText(formData, "displayText"),
		country: readText(formData, "country"),
		locode: readText(formData, "locode"),
		latitude: readFloat(formData, "latitude"),
		longitude: readFloat(formData, "longitude"),
		description: readText(formData, "description"),
		sourceUrl: readText(formData, "sourceUrl"),
	};
}

export async function createCruisePort(prevState, formData) {
	const user = await requireAdmin();
	const fields = readPortFields(formData);
	if (!fields.name) return "Port name is required.";

	try {
		const port = await prisma.cruisePort.create({ data: fields });
		await logActivity({ entityType: "CruisePort", entityId: port.id, action: "created", description: `Cruise port "${port.name}" created`, userId: user.id });
	} catch (error) {
		if (error?.code === "P2002") return "A port with this name and country already exists.";
		console.error("createCruisePort failed", error);
		return "Unable to create the port right now.";
	}

	revalidatePath("/settings/cruise-catalog/ports");
}

export async function updateCruisePort(portId, prevState, formData) {
	const user = await requireAdmin();
	const fields = readPortFields(formData);
	if (!fields.name) return "Port name is required.";

	try {
		const port = await prisma.cruisePort.update({ where: { id: portId }, data: fields });
		await logActivity({ entityType: "CruisePort", entityId: port.id, action: "updated", description: `Cruise port "${port.name}" updated`, userId: user.id });
	} catch (error) {
		if (error?.code === "P2002") return "A port with this name and country already exists.";
		console.error("updateCruisePort failed", error);
		return "Unable to update the port right now.";
	}

	revalidatePath("/settings/cruise-catalog/ports");
}

export async function deleteCruisePort(portId) {
	const user = await requireAdmin();
	const port = await prisma.cruisePort.findUnique({ where: { id: portId } });
	if (!port) return;

	await prisma.cruisePort.delete({ where: { id: portId } });
	await logActivity({ entityType: "CruisePort", entityId: portId, action: "deleted", description: `Cruise port "${port.name}" deleted`, userId: user.id });
	revalidatePath("/settings/cruise-catalog/ports");
}
