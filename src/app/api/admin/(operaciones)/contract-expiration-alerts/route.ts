import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { getAdminSession } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

const alertWindowDays = 30;

type ContractDocument = Document & {
  _id: ObjectId;
  clientName?: string;
  serviceType?: string;
  endDate?: string;
  status?: "active" | "paused" | "finished";
  workplaces?: {
    supervisorId?: string;
    supervisorName?: string;
    areas?: {
      shifts?: {
        assignedStaff?: { assignmentStatus?: string }[];
      }[];
    }[];
  }[];
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const limit = addDays(today, alertWindowDays);
  const contracts = await db
    .collection<ContractDocument>("contracts")
    .find({ status: { $in: ["active", "paused"] }, endDate: { $gte: today, $lte: limit } })
    .sort({ endDate: 1 })
    .toArray();
  const expired = await db
    .collection<ContractDocument>("contracts")
    .find({ status: { $in: ["active", "paused"] }, endDate: { $lt: today, $ne: "" } })
    .sort({ endDate: 1 })
    .toArray();

  const closed: ContractDocument[] = [];
  for (const contract of expired) {
    const nextWorkplaces = releaseContractStaff(contract.workplaces || []);
    await db.collection("contracts").updateOne(
      { _id: contract._id },
      { $set: { status: "finished", workplaces: nextWorkplaces, updatedAt: new Date() } }
    );
    closed.push(contract);
  }

  const relevantContracts = [...contracts, ...closed].filter((contract) => isRelevantForSession(contract, session));
  await createNotifications(db, [...contracts, ...closed], today);

  return NextResponse.json({
    ok: true,
    alerts: relevantContracts.map((contract) => ({
      id: contract._id.toString(),
      clientName: contract.clientName || "Contrato sin cliente",
      serviceType: contract.serviceType || "",
      endDate: contract.endDate || "",
      daysLeft: daysBetween(today, contract.endDate || today),
      supervisors: getSupervisorNames(contract),
      staffCount: countAssignedStaff(contract),
      autoClosed: closed.some((item) => item._id.equals(contract._id)),
    })),
  });
}

function releaseContractStaff(workplaces: NonNullable<ContractDocument["workplaces"]>) {
  return workplaces.map((workplace) => ({
    ...workplace,
    areas: (workplace.areas || []).map((area) => ({
      ...area,
      shifts: (area.shifts || []).map((shift) => ({
        ...shift,
        assignedStaff: (shift.assignedStaff || []).map((staff) => ({ ...staff, assignmentStatus: "inactive" })),
      })),
    })),
  }));
}

function isRelevantForSession(contract: ContractDocument, session: { name?: string; email: string; roles: string[] }) {
  if (session.roles.some((role) => ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "accounting"].includes(role))) return true;
  if (!session.roles.includes("supervisor")) return false;
  const identity = `${session.name || ""} ${session.email}`.toLowerCase();
  return getSupervisorNames(contract).some((name) => identity.includes(name.toLowerCase()) || name.toLowerCase().includes((session.name || "").toLowerCase()));
}

async function createNotifications(db: Awaited<ReturnType<typeof getDb>>, contracts: ContractDocument[], today: string) {
  for (const contract of contracts) {
    const autoClosed = contract.endDate && contract.endDate < today;
    const title = autoClosed ? "Contrato finalizado automaticamente" : "Contrato proximo a finalizar";
    const roles = ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "accounting", "supervisor"];
    for (const role of roles) {
      const existing = await db.collection("notifications").findOne({
        title,
        role,
        dueDate: today,
        message: { $regex: escapeRegex(contract._id.toString()) },
      });
      if (existing) continue;
      await db.collection("notifications").insertOne({
        title,
        role,
        message: `${contract._id.toString()} | ${contract.clientName || "Contrato"} termina el ${contract.endDate || "sin fecha"}. ${autoClosed ? "El contrato fue marcado como finalizado y el personal quedo disponible." : "Valida la informacion antes del cierre."}`,
        dueDate: today,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

function getSupervisorNames(contract: ContractDocument) {
  return Array.from(new Set((contract.workplaces || []).map((workplace) => workplace.supervisorName || "").filter(Boolean)));
}

function countAssignedStaff(contract: ContractDocument) {
  return (contract.workplaces || []).reduce((workplaceSum, workplace) => workplaceSum + (workplace.areas || []).reduce((areaSum, area) => areaSum + (area.shifts || []).reduce((shiftSum, shift) => shiftSum + (shift.assignedStaff || []).filter((staff) => staff.assignmentStatus !== "inactive").length, 0), 0), 0);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00`).getTime();
  const rightDate = new Date(`${right}T00:00:00`).getTime();
  return Math.ceil((rightDate - leftDate) / 86400000);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
