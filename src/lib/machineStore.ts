import "server-only";

import { ObjectId, type Filter } from "mongodb";
import { z } from "zod";
import { ensureCounterAtLeast, getNextCode } from "@/lib/codeSequence";
import { getDb } from "@/lib/mongodb";
import type { Machine, MachineCustodyReceipt, MachineUsageLog } from "@/types/admin";

const machinesCollection = "machines";

const machineSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio.").trim(),
  code: z.string().trim().optional().or(z.literal("")),
  type: z.string().min(2, "El tipo es obligatorio.").trim(),
  photoUrl: z.string().url("La URL de la foto no es valida.").optional().or(z.literal("")),
  photoPublicId: z.string().trim().optional().or(z.literal("")),
  environment: z
    .enum(["hospitals", "public_institutions", "homes", "workshops", "companies", "other"])
    .default("companies"),
  status: z.enum(["available", "assigned", "maintenance", "inactive"]).default("available"),
  location: z.string().trim().optional().or(z.literal("")),
  assignedTo: z.string().trim().optional().or(z.literal("")),
  ownerWorkGroupId: z.string().trim().optional().or(z.literal("")),
  ownerWorkGroupName: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

const usageLogSchema = z.object({
  date: z.string().min(10, "La fecha es obligatoria.").trim(),
  usedBy: z.string().min(2, "Indica quien uso el equipo.").trim(),
  clientOrLocation: z.string().min(2, "Indica cliente o ubicacion.").trim(),
  startTime: z.string().min(4, "Hora inicial obligatoria.").trim(),
  endTime: z.string().min(4, "Hora final obligatoria.").trim(),
  hoursUsed: z.coerce.number().min(0, "Las horas no pueden ser negativas."),
  conditionBefore: z.string().min(2, "Estado inicial obligatorio.").trim(),
  conditionAfter: z.string().min(2, "Estado final obligatorio.").trim(),
  observations: z.string().trim().optional().or(z.literal("")),
});

const custodyReceiptSchema = z.object({
  date: z.string().min(10, "La fecha es obligatoria.").trim(),
  deliveredBy: z.string().min(2, "Indica quien entrega.").trim(),
  receivedBy: z.string().min(2, "Indica quien recibe.").trim(),
  origin: z.string().min(2, "Origen obligatorio.").trim(),
  destination: z.string().min(2, "Destino obligatorio.").trim(),
  reason: z.string().min(2, "Motivo obligatorio.").trim(),
  expectedReturnDate: z.string().trim().optional().or(z.literal("")),
  condition: z.string().min(2, "Estado del equipo obligatorio.").trim(),
  documentUrl: z.string().url("La URL del recibo no es valida.").optional().or(z.literal("")),
  documentPublicId: z.string().trim().optional().or(z.literal("")),
  observations: z.string().trim().optional().or(z.literal("")),
});

type MachineDocument = Omit<Machine, "_id" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export async function getMachines(query: Filter<MachineDocument> = {}) {
  const db = await getDb();
  const machines = await db
    .collection<MachineDocument>(machinesCollection)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return machines.map(serializeMachine);
}

export async function createMachine(input: unknown) {
  const data = normalizeMachine(machineSchema.parse(input));
  const db = await getDb();
  const now = new Date();
  await syncMachineCounter(db);
  const code = data.code || (await getNextCode("machines", "MAQ"));
  const document: MachineDocument = { ...data, code, createdAt: now, updatedAt: now };

  const result = await db.collection<MachineDocument>(machinesCollection).insertOne(document);
  return serializeMachine({ ...document, _id: result.insertedId });
}

async function syncMachineCounter(db: Awaited<ReturnType<typeof getDb>>) {
  const lastMachine = await db
    .collection<MachineDocument>(machinesCollection)
    .find({ code: /^MAQ\d{7}$/ })
    .sort({ code: -1 })
    .limit(1)
    .next();

  const lastValue = Number(lastMachine?.code?.replace("MAQ", ""));
  if (Number.isFinite(lastValue) && lastValue > 0) {
    await ensureCounterAtLeast("machines", lastValue);
  }
}

export async function updateMachine(id: string, input: unknown) {
  const data = normalizeMachine(machineSchema.parse(input));
  const db = await getDb();
  const result = await db.collection<MachineDocument>(machinesCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  return result ? serializeMachine(result) : null;
}

export async function deleteMachine(id: string) {
  const db = await getDb();
  const result = await db.collection<MachineDocument>(machinesCollection).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function addMachineUsageLog(id: string, input: unknown) {
  const data = normalizeOptionalFields(usageLogSchema.parse(input));
  const db = await getDb();
  const log: MachineUsageLog = {
    ...data,
    _id: new ObjectId().toString(),
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection<MachineDocument>(machinesCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $push: { usageLogs: log }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  return result ? serializeMachine(result) : null;
}

export async function addMachineCustodyReceipt(id: string, input: unknown) {
  const data = normalizeOptionalFields(custodyReceiptSchema.parse(input));
  const db = await getDb();
  const receipt: MachineCustodyReceipt = {
    ...data,
    _id: new ObjectId().toString(),
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection<MachineDocument>(machinesCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $push: { custodyReceipts: receipt }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  return result ? serializeMachine(result) : null;
}

export function getStoreErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }

  if (error instanceof Error) return error.message;

  return "No se pudo completar la accion.";
}

function normalizeMachine(machine: z.infer<typeof machineSchema>) {
  return {
    ...machine,
    code: machine.code || undefined,
    photoUrl: machine.photoUrl || undefined,
    photoPublicId: machine.photoPublicId || undefined,
    location: machine.location || undefined,
    assignedTo: machine.assignedTo || undefined,
    ownerWorkGroupId: machine.ownerWorkGroupId || undefined,
    ownerWorkGroupName: machine.ownerWorkGroupName || undefined,
    notes: machine.notes || undefined,
  };
}

function normalizeOptionalFields<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === "" ? undefined : item])) as T;
}

function serializeMachine(machine: MachineDocument): Machine {
  return {
    ...machine,
    _id: machine._id?.toString(),
    environment: machine.environment || "companies",
    usageLogs: machine.usageLogs || [],
    custodyReceipts: machine.custodyReceipts || [],
    createdAt: machine.createdAt?.toISOString(),
    updatedAt: machine.updatedAt?.toISOString(),
  };
}
