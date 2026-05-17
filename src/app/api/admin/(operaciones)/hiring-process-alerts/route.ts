import { NextResponse } from "next/server";
import { type Document } from "mongodb";
import { getAdminSession } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { formatHiringDateTime, obtenerEstadoActividad, ordenarCronograma } from "@/lib/hiringProcessUtils";
import { getWorkGroupScope } from "@/lib/workGroupScope";
import { scopedHiringProcessQuery } from "@/app/api/admin/(operaciones)/hiring-processes/route";
import type { HiringProcess } from "@/types/admin";

const alertRoles = ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "accounting", "supervisor", "operations", "human_resources", "legal_representative"];

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (!session.roles.some((role) => alertRoles.includes(role))) return NextResponse.json({ ok: true, alerts: [] });

  const db = await getDb();
  const scope = await getWorkGroupScope();
  if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const limit = addDays(today, 15);
  const processes = (await db
    .collection<Document>("hiring_processes")
    .find({ estadoProceso: { $nin: ["Finalizado", "Cancelado", "Desierto"] }, ...scopedHiringProcessQuery(scope) })
    .sort({ fechaVencimiento: 1 })
    .toArray()) as unknown as HiringProcess[];

  const alerts = [
    ...processes.flatMap((process) => buildNewProcessAlerts(process, today)),
    ...processes.flatMap((process) => buildProcessAlerts(process, today, limit)),
  ];
  await createNotifications(db, alerts, today);

  return NextResponse.json({ ok: true, alerts: alerts.slice(0, 8) });
}

function buildNewProcessAlerts(process: HiringProcess, today: string) {
  const createdAt = typeof process.createdAt === "string" ? process.createdAt.slice(0, 10) : "";
  if (!createdAt || createdAt < addDays(today, -7)) return [];
  const groupNames = getProcessGroupNames(process);
  const group = groupNames.length ? ` | Empresas: ${groupNames.join(", ")}` : "";
  return [{
    processId: String(process._id || ""),
    numeroProceso: process.numeroProceso,
    title: "Nuevo proceso de contratacion",
    date: createdAt,
    message: `Nuevo proceso: ${process.numeroProceso} - ${process.entidadCliente}${group}`,
    workGroupId: process.workGroups?.[0]?.id || process.workGroupId || "",
    workGroupName: process.workGroups?.[0]?.name || process.workGroupName || "",
  }];
}

function buildProcessAlerts(process: HiringProcess, today: string, limit: string) {
  const dates = ordenarCronograma(process.cronograma || []).filter((date) => date.estado !== "Cumplida");
  const cronogramaAlerts = dates
    .filter((date) => date.fechaHora.slice(0, 10) >= today && date.fechaHora.slice(0, 10) <= limit)
    .map((date) => ({
      processId: String(process._id || ""),
      numeroProceso: process.numeroProceso,
      title: date.tipoFecha,
      date: date.fechaHora,
      message: `${process.numeroProceso} - ${date.tipoFecha}: ${formatHiringDateTime(date.fechaHora)}`,
      workGroupId: process.workGroups?.[0]?.id || process.workGroupId || "",
      workGroupName: process.workGroups?.[0]?.name || process.workGroupName || "",
    }));

  const agendaAlerts = (process.agendaOperacional || [])
    .filter((activity) => obtenerEstadoActividad(activity) === "Vencido" || activity.fechaHoraInicio.slice(0, 10) === today)
    .map((activity) => ({
      processId: String(process._id || ""),
      numeroProceso: process.numeroProceso,
      title: activity.titulo,
      date: activity.fechaHoraInicio,
      message: `${process.numeroProceso} - ${activity.titulo}: ${formatHiringDateTime(activity.fechaHoraInicio)}`,
      workGroupId: process.workGroups?.[0]?.id || process.workGroupId || "",
      workGroupName: process.workGroups?.[0]?.name || process.workGroupName || "",
    }));

  return [...cronogramaAlerts, ...agendaAlerts];
}

async function createNotifications(db: Awaited<ReturnType<typeof getDb>>, alerts: ReturnType<typeof buildProcessAlerts>, today: string) {
  for (const alert of alerts) {
    for (const role of alertRoles) {
      const existing = await db.collection("notifications").findOne({
        title: "Fecha de proceso proxima",
        role,
        workGroupId: alert.workGroupId || "",
        workGroupName: alert.workGroupName || "",
        dueDate: today,
        message: { $regex: escapeRegex(`${alert.processId}|${alert.title}|${alert.date}`) },
      });
      if (existing) continue;
      await db.collection("notifications").insertOne({
        title: "Fecha de proceso proxima",
        role,
        message: `${alert.processId}|${alert.title}|${alert.date} - ${alert.message}`,
        workGroupId: alert.workGroupId || "",
        workGroupName: alert.workGroupName || "",
        dueDate: today,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

function getProcessGroupNames(process: HiringProcess) {
  if (process.workGroups?.length) return process.workGroups.map((group) => group.name).filter(Boolean);
  return process.workGroupName ? [process.workGroupName] : [];
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
