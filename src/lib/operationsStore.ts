import "server-only";

import { ObjectId, type Document, type OptionalUnlessRequiredId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";

type BaseDocument<T> = Omit<T, "_id" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const text = (message: string) => z.string().min(2, message).trim();
const optionalText = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z.string().trim().optional().or(z.literal(""))
);
const idText = z.string().trim().default("");
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0).optional()
);
const optionalEmail = (message: string) => z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().email(message).optional()
);
const documentIdText = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "La cedula debe tener 10 digitos numericos.");

export const workerSchema = z.object({
  documentId: documentIdText,
  firstName: text("Los nombres son obligatorios."),
  lastName: text("Los apellidos son obligatorios."),
  position: text("El cargo es obligatorio."),
  phone: text("El contacto es obligatorio."),
  email: z.string().email("El correo no es valido.").optional().or(z.literal("")),
  photoUrl: optionalText,
  photoPublicId: optionalText,
  bankName: optionalText,
  bankAccountType: optionalText,
  bankAccountNumber: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  documents: optionalText,
  assignedClientId: optionalText,
  assignedClient: optionalText,
  assignedContractId: optionalText,
  assignedContract: optionalText,
  assignedArea: optionalText,
  assignedSchedule: optionalText,
  supervisor: optionalText,
  workGroupId: optionalText,
  workGroupName: optionalText,
  talentProfile: z.object({
    completed: z.boolean().optional().default(false),
    completedAt: optionalText,
    currentDate: optionalText,
    birthDate: optionalText,
    age: optionalNumber,
    civilStatus: optionalText,
    homePhone: optionalText,
    hasConadisCard: optionalText,
    bloodType: optionalText,
    experienceYears: optionalNumber,
    province: optionalText,
    canton: optionalText,
    parish: optionalText,
    zone: optionalText,
    mainStreet: optionalText,
    secondaryStreet: optionalText,
    houseNumber: optionalText,
    shirtSize: optionalText,
    pantsSize: optionalText,
    shoeSize: optionalText,
    familyLoads: z.array(z.object({
      id: idText,
      type: z.string().trim().default(""),
      fullName: z.string().trim().default(""),
      documentId: optionalText,
      birthDate: optionalText,
      age: optionalNumber,
      conadisCard: optionalText,
    }).strip()).default([]),
    education: z.array(z.object({
      id: idText,
      level: z.string().trim().default(""),
      completed: optionalText,
      institution: optionalText,
      title: optionalText,
    }).strip()).default([]),
    mainCourses: optionalText,
    additionalKnowledge: optionalText,
    workHistory: z.array(z.object({
      id: idText,
      position: optionalText,
      employer: optionalText,
      workTime: optionalText,
      startDate: optionalText,
      endDate: optionalText,
      phone: optionalText,
      exitReason: optionalText,
    }).strip()).default([]),
    trainings: z.array(z.object({
      id: idText,
      name: z.string().trim().default(""),
      description: optionalText,
      placeOrCompany: optionalText,
      date: optionalText,
    }).strip()).default([]),
    personalReferences: z.array(z.object({
      id: idText,
      name: z.string().trim().default(""),
      relationship: optionalText,
      phone: optionalText,
      residence: optionalText,
    }).strip()).default([]),
    declarationAccepted: z.boolean().optional().default(false),
  }).strip().optional(),
  eppDelivery: z.object({
    completed: z.boolean().optional().default(false),
    deliveryDate: optionalText,
    period: optionalText,
    employer: optionalText,
    contractId: optionalText,
    contractName: optionalText,
    workplace: optionalText,
    representativeName: optionalText,
    observations: optionalText,
    generatedAt: optionalText,
    items: z.array(z.object({
      id: idText,
      name: z.string().trim().default(""),
      quantity: optionalNumber,
      delivered: z.boolean().optional().default(false),
      notes: optionalText,
    }).strip()).default([]),
  }).strip().optional(),
}).strip();

export const employeePositionSchema = z.object({
  code: text("El codigo del cargo es obligatorio."),
  name: text("El nombre del cargo es obligatorio."),
  description: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const serviceTypeSchema = z.object({
  code: text("El codigo de servicio es obligatorio."),
  name: text("El nombre del servicio es obligatorio."),
  detail: text("El detalle del servicio es obligatorio."),
  activities: text("Las actividades del servicio son obligatorias."),
  imageUrl: optionalText,
  imagePublicId: optionalText,
  regularPrice: optionalNumber,
  discountPercent: optionalNumber,
  offerPrice: optionalNumber,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const workGroupSchema = z.object({
  name: text("El nombre del grupo es obligatorio."),
  description: optionalText,
  supervisorId: optionalText,
  supervisorName: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const clientSchema = z.object({
  name: text("El nombre del cliente es obligatorio."),
  taxId: text("El RUC/NIT es obligatorio."),
  address: text("La direccion es obligatoria."),
  contactName: text("El contacto es obligatorio."),
  contactPhone: text("El telefono de contacto es obligatorio."),
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

const assignedContractStaffSchema = z.object({
  id: idText,
  shiftId: optionalText,
  workerId: text("Selecciona un trabajador."),
  firstName: text("Los nombres son obligatorios."),
  lastName: text("Los apellidos son obligatorios."),
  documentId: text("La cedula es obligatoria."),
  position: text("El cargo es obligatorio."),
  phone: text("El telefono es obligatorio."),
  assignmentStatus: z.enum(["active", "inactive"]).default("active"),
  assignmentDate: z.string().min(10, "La fecha de asignacion es obligatoria.").trim(),
}).strip();

const contractShiftSchema = z.object({
  id: idText,
  areaId: optionalText,
  shiftName: text("El nombre del turno es obligatorio."),
  startTime: z.string().min(4, "La hora de inicio es obligatoria.").trim(),
  endTime: z.string().min(4, "La hora de fin es obligatoria.").trim(),
  lunchBreakMinutes: optionalNumber,
  workDays: z.array(z.string()).default([]),
  observation: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  assignedStaff: z.array(assignedContractStaffSchema).default([]),
}).strip();

const contractAreaSchema = z.object({
  id: idText,
  workplaceId: optionalText,
  name: text("El nombre del area es obligatorio."),
  description: optionalText,
  areaType: optionalText,
  internalLocation: optionalText,
  cleaningFrequency: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  shifts: z.array(contractShiftSchema).default([]),
}).strip();

const contractWorkplaceSchema = z.object({
  id: idText,
  contractId: optionalText,
  name: text("El nombre del lugar de trabajo es obligatorio."),
  address: optionalText,
  supervisorId: optionalText,
  supervisorName: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  areas: z.array(contractAreaSchema).default([]),
}).strip();

export const contractSchema = z.object({
  clientId: optionalText,
  clientName: text("El cliente es obligatorio."),
  contractNumber: optionalText,
  contractAdministrator: optionalText,
  contractAdministratorEmail: optionalEmail("El correo del administrador no es valido."),
  contractAdministratorPhone: optionalText,
  serviceType: text("El tipo de servicio es obligatorio."),
  area: optionalText,
  shift: optionalText,
  startDate: z.string().min(10, "La fecha de inicio es obligatoria.").trim(),
  endDate: optionalText,
  workGroupId: optionalText,
  workGroupName: optionalText,
  assignedStaffIds: z.array(z.string()).optional().default([]),
  assignedStaff: optionalText,
  status: z.enum(["active", "paused", "finished"]).default("active"),
  workplaces: z.array(contractWorkplaceSchema).default([]),
}).strip();

type ContractInput = z.infer<typeof contractSchema>;

const supervisorReportStaffSchema = z.object({
  id: idText,
  workerId: text("El trabajador es obligatorio."),
  workerName: text("El trabajador es obligatorio."),
  documentId: optionalText,
  position: optionalText,
  startTime: optionalText,
  endTime: optionalText,
  lunchBreakMinutes: optionalNumber,
  totalHours: optionalNumber,
  normalHours: optionalNumber,
  overtimeHours: optionalNumber,
  authorizedOvertimeHours: optionalNumber,
  delayMinutes: optionalNumber,
  fineAmount: optionalNumber,
  permissionHours: optionalNumber,
  sicknessHours: optionalNumber,
  attendanceStatus: z.enum(["attended", "absent", "permission", "sick", "late", "replacement"]),
  supportDocumentSubject: optionalText,
  supportDocumentUrl: optionalText,
  supportDocumentPublicId: optionalText,
  supportDocumentName: optionalText,
  notes: optionalText,
}).strip();

export const supervisorReportSchema = z.object({
  date: z.string().min(10, "La fecha es obligatoria.").trim(),
  period: optionalText,
  supervisorId: optionalText,
  supervisor: text("El supervisor es obligatorio."),
  workerId: optionalText,
  workerName: text("El trabajador es obligatorio."),
  clientId: optionalText,
  clientName: text("El cliente es obligatorio."),
  contractId: optionalText,
  contractName: optionalText,
  workplaceId: optionalText,
  workplaceName: optionalText,
  areaId: optionalText,
  areaName: optionalText,
  shiftId: optionalText,
  shiftName: optionalText,
  workGroupId: optionalText,
  workGroupName: optionalText,
  startTime: optionalText,
  endTime: optionalText,
  lunchBreakMinutes: optionalNumber,
  totalHours: optionalNumber,
  normalHours: optionalNumber,
  overtimeHours: optionalNumber,
  authorizedOvertimeHours: optionalNumber,
  delayMinutes: optionalNumber,
  fineAmount: optionalNumber,
  permissionHours: optionalNumber,
  sicknessHours: optionalNumber,
  attendanceStatus: z.enum(["attended", "absent", "permission", "sick", "late", "replacement"]),
  reportStatus: z.enum(["draft", "submitted", "observed", "approved", "rejected"]).default("draft"),
  approvalNotes: optionalText,
  notes: optionalText,
  staffReports: z.array(supervisorReportStaffSchema).default([]),
}).strip();

export const workerIntakeSchema = z.object({
  documentId: documentIdText,
  fullName: text("El nombre completo es obligatorio."),
  phone: text("El contacto es obligatorio."),
  email: z.string().email("El correo no es valido.").trim(),
  position: text("El cargo es obligatorio."),
  address: text("La direccion es obligatoria."),
  resumeUrl: optionalText,
  resumePublicId: optionalText,
  status: z.enum(["received", "reviewing", "accepted", "rejected"]).default("received"),
  approvedWorkerId: optionalText,
  approvedAt: optionalText,
}).strip();

export const workerDocumentSchema = z.object({
  workerId: optionalText,
  workerName: text("El trabajador es obligatorio."),
  documentType: text("El tipo de documento es obligatorio."),
  fileUrl: optionalText,
  filePublicId: optionalText,
  uploadDate: z.string().min(10, "La fecha de carga es obligatoria.").trim(),
  expirationDate: optionalText,
  status: z.enum(["valid", "expired", "pending_review"]).default("pending_review"),
  notes: optionalText,
}).strip();

const supplyKitItemSchema = z.object({
  id: z.string().trim().default(""),
  productId: optionalText,
  productCode: optionalText,
  productName: text("El producto del kit es obligatorio."),
  productCategory: optionalText,
  unit: optionalText,
  quantity: z.coerce.number().min(0.01, "La cantidad del insumo debe ser mayor a cero."),
  notes: optionalText,
}).strip();

export const supplyKitSchema = z.object({
  kitCode: optionalText,
  clientId: optionalText,
  clientName: text("El cliente es obligatorio."),
  contractId: optionalText,
  contractName: optionalText,
  workplaceId: optionalText,
  workplaceName: optionalText,
  supervisorId: optionalText,
  supervisorName: optionalText,
  productId: optionalText,
  productCode: optionalText,
  productCategory: optionalText,
  unit: optionalText,
  productName: z.string().trim().default("Kit mensual"),
  items: z.array(supplyKitItemSchema).default([]),
  quantity: z.coerce.number().min(0, "La cantidad debe ser mayor o igual a cero."),
  frequency: text("La frecuencia es obligatoria."),
  kitPeriod: optionalText,
  notes: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

const supplyKitDeliveryItemSchema = supplyKitItemSchema.extend({
  source: z.enum(["base", "extra"]).default("base"),
}).strip();

export const supplyKitDeliverySchema = z.object({
  kitId: text("El kit es obligatorio."),
  kitCode: optionalText,
  period: z.string().min(7, "El periodo mensual es obligatorio.").trim(),
  clientId: optionalText,
  clientName: text("El cliente es obligatorio."),
  contractId: optionalText,
  contractName: optionalText,
  workplaceId: optionalText,
  workplaceName: optionalText,
  supervisorId: optionalText,
  supervisorName: optionalText,
  items: z.array(supplyKitDeliveryItemSchema).default([]),
  totalQuantity: z.coerce.number().min(0).default(0),
  responsible: optionalText,
  deliveryDate: z.string().min(10, "La fecha de entrega es obligatoria.").trim(),
  notes: optionalText,
  status: z.enum(["draft", "delivered", "cancelled"]).default("draft"),
}).strip();

export const supplyProductSchema = z.object({
  code: text("El codigo es obligatorio."),
  auxiliaryCode: optionalText,
  name: text("El nombre del producto es obligatorio."),
  category: text("La categoria es obligatoria."),
  brand: optionalText,
  unit: text("La unidad de medida es obligatoria."),
  unitsPerBox: optionalNumber,
  stock: optionalNumber,
  iva: optionalText,
  cost: optionalNumber,
  salePrice: optionalNumber,
  technicalInfo: optionalText,
  notes: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const supplyMovementSchema = z.object({
  clientId: optionalText,
  clientName: text("El cliente es obligatorio."),
  productName: text("El producto es obligatorio."),
  deliveredQuantity: z.coerce.number().min(0),
  consumedQuantity: z.coerce.number().min(0),
  pendingQuantity: z.coerce.number().min(0),
  movementDate: z.string().min(10, "La fecha es obligatoria.").trim(),
  responsible: text("El responsable es obligatorio."),
  notes: optionalText,
}).strip();

export const hiringProcessSchema = z.object({
  numeroProceso: text("El numero de proceso es obligatorio."),
  entidadCliente: text("La entidad o cliente es obligatoria."),
  objetoProceso: text("El objeto del proceso es obligatorio."),
  tipoCompra: optionalText,
  presupuestoReferencialSinIva: optionalNumber,
  tipoContratacion: optionalText,
  formaPago: optionalText,
  tipoAdjudicacion: optionalText,
  plazoEntregaDias: optionalNumber,
  vigenciaOfertaDias: optionalNumber,
  funcionarioEncargado: optionalText,
  areaResponsable: z.string().trim().default("Sin area"),
  workGroupId: optionalText,
  workGroupName: optionalText,
  processOwner: optionalText,
  estadoProceso: z.enum(["Planificado", "En seguimiento", "Por vencer", "Vencido", "Adjudicado", "Desierto", "Cancelado", "Finalizado"]).default("Planificado"),
  winningCompany: optionalText,
  winningPrice: optionalNumber,
  descripcion: optionalText,
  notas: optionalText,
  fechaInicio: z.string().min(10, "La fecha de inicio es obligatoria.").trim(),
  fechaVencimiento: z.string().min(10, "La fecha de vencimiento es obligatoria.").trim(),
  cronograma: z.array(z.object({
    id: optionalText,
    tipoFecha: text("El tipo de fecha es obligatorio."),
    fechaHora: z.string().min(10, "La fecha y hora del cronograma es obligatoria.").trim(),
    descripcion: optionalText,
    estado: z.enum(["Pendiente", "Hoy", "Proxima", "Vencida", "Cumplida"]).default("Pendiente"),
    observacion: optionalText,
  }).strip()).default([]),
  agendaOperacional: z.array(z.object({
    id: optionalText,
    titulo: text("El titulo de la actividad es obligatorio."),
    descripcion: optionalText,
    fechaHoraInicio: z.string().min(10, "La fecha de inicio de la actividad es obligatoria.").trim(),
    fechaHoraFin: optionalText,
    responsable: optionalText,
    prioridad: z.enum(["Alta", "Media", "Baja"]).default("Media"),
    estado: z.enum(["Pendiente", "En proceso", "Cumplido", "Vencido", "Reprogramado"]).default("Pendiente"),
    origen: z.enum(["Automatico", "Manual"]).default("Manual"),
    procesoRelacionado: optionalText,
    observaciones: optionalText,
    fechaCumplimiento: optionalText,
  }).strip()).default([]),
  archivos: z.array(z.object({
    id: optionalText,
    nombre: text("El nombre del archivo es obligatorio."),
    url: optionalText,
    tipo: optionalText,
    observacion: optionalText,
    createdAt: optionalText,
  }).strip()).default([]),
  processNumber: optionalText,
  title: optionalText,
  clientName: optionalText,
  area: optionalText,
  startDate: optionalText,
  dueDate: optionalText,
  status: z.enum(["planned", "in_progress", "paused", "completed", "cancelled"]).default("planned"),
  timeline: optionalText,
  notes: optionalText,
}).strip();

export const notificationSchema = z.object({
  title: text("El titulo es obligatorio."),
  role: z.enum(["administrator", "supervisor", "operations", "human_resources", "accounting", "advertising", "legal_representative", "client", "worker", "all"]),
  message: text("El mensaje es obligatorio."),
  dueDate: optionalText,
  status: z.enum(["active", "read", "archived"]).default("active"),
  acknowledgedBy: z.array(z.string().trim()).default([]),
}).strip();

export const galleryImageSchema = z.object({
  title: text("El titulo es obligatorio."),
  category: text("La categoria es obligatoria."),
  imageUrl: text("La imagen es obligatoria."),
  alt: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const certificationSchema = z.object({
  title: text("El titulo es obligatorio."),
  issuer: optionalText,
  category: text("La categoria es obligatoria."),
  fileUrl: text("El archivo o imagen es obligatorio."),
  fileType: z.enum(["image", "document"]).default("image"),
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export function createCrudStore<T>(collectionName: string, schema: z.ZodType<Omit<T, "_id" | "createdAt" | "updatedAt">>) {
  return {
    async list() {
      const db = await getDb();
      const items = await db.collection<Document>(collectionName).find().sort({ createdAt: -1 }).toArray();
      return items.map((item) => serialize(item as BaseDocument<T>));
    },

    async create(input: unknown) {
      const data = normalize(schema.parse(input));
      const db = await getDb();
      const now = new Date();
      const document = { ...data, createdAt: now, updatedAt: now } as BaseDocument<T>;
      const result = await db
        .collection<Document>(collectionName)
        .insertOne(document as OptionalUnlessRequiredId<BaseDocument<T>>);
      return serialize({ ...document, _id: result.insertedId });
    },

    async update(id: string, input: unknown) {
      const data = normalize(schema.parse(input));
      const db = await getDb();
      const result = await db
        .collection<Document>(collectionName)
        .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
      return result ? serialize(result as BaseDocument<T>) : null;
    },

    async remove(id: string) {
      const db = await getDb();
      const result = await db.collection<Document>(collectionName).deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    },
  };
}

export async function validateContractStaffAvailability(input: ContractInput, excludeId?: string) {
  if (input.status === "finished") return;

  const currentAssignments = collectContractAssignments(input);
  const sameShiftKeys = new Set<string>();
  for (const assignment of currentAssignments) {
    const key = `${assignment.shiftId}:${assignment.workerId}`;
    if (sameShiftKeys.has(key)) {
      throw new Error("Un trabajador no puede repetirse en el mismo horario.");
    }
    sameShiftKeys.add(key);
  }

  for (let leftIndex = 0; leftIndex < currentAssignments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < currentAssignments.length; rightIndex += 1) {
      const left = currentAssignments[leftIndex];
      const right = currentAssignments[rightIndex];
      if (left.workerId === right.workerId && schedulesOverlap(left, right)) {
        throw new Error(`El trabajador ${left.workerName} ya esta asignado a otro turno que se cruza dentro del mismo contrato.`);
      }
    }
  }

  if (!currentAssignments.length) return;

  const db = await getDb();
  const query: Document = {
    status: { $in: ["active", "paused"] },
  };

  if (excludeId) {
    query._id = { $ne: new ObjectId(excludeId) };
  }

  const conflicts = await db.collection<Document>("contracts").find(query).toArray();
  for (const conflict of conflicts) {
    const otherAssignments = collectContractAssignments(conflict as unknown as ContractInput);
    for (const current of currentAssignments) {
      const overlap = otherAssignments.find((other) => current.workerId === other.workerId && schedulesOverlap(current, other));
      if (overlap) {
        throw new Error(`El trabajador ${current.workerName} ya esta asignado a un turno que se cruza en ${String(conflict.clientName || "otro contrato")}.`);
      }
    }
  }
}

export async function validateWorkerDocumentId(documentId: string, excludeId?: string) {
  const cleanDocumentId = documentId.trim();
  if (!cleanDocumentId) return;

  const db = await getDb();
  const query: Document = { documentId: cleanDocumentId };
  if (excludeId) {
    query._id = { $ne: new ObjectId(excludeId) };
  }

  const existing = await db.collection<Document>("workers").findOne(query);
  if (existing) {
    throw new Error("Ya existe un trabajador registrado con esta cedula.");
  }
}

export async function validateWorkerIntakeDocumentId(documentId: string, excludeIntakeId?: string) {
  const cleanDocumentId = documentId.trim();
  if (!cleanDocumentId) return;

  const db = await getDb();
  const worker = await db.collection<Document>("workers").findOne({ documentId: cleanDocumentId });
  if (worker) {
    throw new Error("Ya existe un trabajador registrado con esta cedula.");
  }

  const intakeQuery: Document = { documentId: cleanDocumentId, status: { $ne: "rejected" } };
  if (excludeIntakeId && ObjectId.isValid(excludeIntakeId)) {
    intakeQuery._id = { $ne: new ObjectId(excludeIntakeId) };
  }

  const intake = await db.collection<Document>("worker_intakes").findOne(intakeQuery);
  if (intake) {
    throw new Error("Ya existe un ingreso de trabajador activo con esta cedula.");
  }
}

export async function ensureDefaultEmployeePositions() {
  const db = await getDb();
  const count = await db.collection<Document>("employee_positions").countDocuments();
  if (count > 0) return;

  const now = new Date();
  const names = [
    "ADMINISTRADOR",
    "PRESIDENTE",
    "REPRESENTANTE LEGAL",
    "CONTADORA",
    "SECRETARIA",
    "SUPERVISOR GENERAL",
    "SUPERVISOR",
    "AUXILIAR DE LIMPIEZA",
    "BODEGUERO",
    "MEDICO OCUPACIONAL",
    "AUXILIAR DE DILUSIONES",
  ];

  await db.collection<Document>("employee_positions").insertMany(
    names.map((name, index) => ({
      code: `CAR-${String(index + 1).padStart(3, "0")}`,
      name,
      description: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export async function ensureDefaultServiceTypes() {
  const db = await getDb();
  const count = await db.collection<Document>("service_types").countDocuments();
  if (count > 0) return;

  const now = new Date();
  const services = [
    ["SER-001", "Limpieza hospitalaria", "Mantenemos la asepsia en hospitales, clinicas y laboratorios con protocolos de bioseguridad certificados.", "/hospital.jpg"],
    ["SER-002", "Limpieza de oficinas y edificios", "Cuidamos la presentacion y salubridad de entornos laborales mediante limpiezas diarias, profundas y de mantenimiento.", "/oficinas.jpg"],
    ["SER-003", "Limpieza especializada", "Servicios adaptados a industrias, plantas de produccion y zonas de dificil acceso, con personal tecnico calificado.", "/work3.jpg"],
    ["SER-004", "Sanitizacion de ambientes", "Eliminamos virus, bacterias y hongos con tecnicas avanzadas de nebulizacion y desinfeccion.", "/sanitizacion.jpg"],
    ["SER-005", "Limpieza de hogar", "Soluciones confiables para el cuidado y limpieza de viviendas, con personal de confianza.", "/hogar1.jpg"],
    ["SER-006", "Limpieza de centros comerciales y retail", "Mantenimiento integral de espacios con alta afluencia de personas.", "/retail3.jpg"],
    ["SER-007", "Limpieza y mantenimiento de areas verdes", "Podas, riegos y mantenimiento de jardines para conservar espacios naturales y agradables.", "/jardin3.jpg"],
    ["SER-008", "Fumigacion, desinfeccion y desratizacion", "Tratamientos certificados para el control de plagas, garantizando seguridad y efectividad.", "/fumigar.jpg"],
  ];

  await db.collection<Document>("service_types").insertMany(
    services.map(([code, name, detail, imageUrl]) => ({
      code,
      name,
      detail,
      activities: detail,
      imageUrl,
      imagePublicId: "",
      regularPrice: 0,
      discountPercent: 0,
      offerPrice: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export function getOperationsErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
        return `${field}${issue.message}`;
      })
      .join(" ");
  }
  if (error instanceof Error) return error.message;
  return "No se pudo completar la accion.";
}

function normalize<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === "" ? undefined : item])) as T;
}

function serialize<T>(document: BaseDocument<T>) {
  return {
    ...document,
    _id: document._id?.toString(),
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString(),
  } as T;
}

type ContractAssignmentCheck = {
  workerId: string;
  workerName: string;
  shiftId: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  workDays: string[];
};

function collectContractAssignments(contract: ContractInput): ContractAssignmentCheck[] {
  const nested = (contract.workplaces || []).flatMap((workplace) =>
    (workplace.areas || []).flatMap((area) =>
      (area.shifts || []).flatMap((shift) =>
        (shift.assignedStaff || [])
          .filter((staff) => staff.assignmentStatus !== "inactive" && shift.status !== "inactive")
          .map((staff) => ({
            workerId: staff.workerId,
            workerName: `${staff.firstName} ${staff.lastName}`.trim(),
            shiftId: shift.id || shift.shiftName,
            startDate: contract.startDate,
            endDate: contract.endDate,
            startTime: shift.startTime,
            endTime: shift.endTime,
            workDays: shift.workDays || [],
          }))
      )
    )
  );

  if (nested.length) return nested;

  return (contract.assignedStaffIds || []).map((workerId) => ({
    workerId,
    workerName: workerId,
    shiftId: contract.shift || "turno",
    startDate: contract.startDate,
    endDate: contract.endDate,
    startTime: "00:00",
    endTime: "23:59",
    workDays: [],
  }));
}

function schedulesOverlap(left: ContractAssignmentCheck, right: ContractAssignmentCheck) {
  return dateRangesOverlap(left.startDate, left.endDate, right.startDate, right.endDate)
    && daysOverlap(left.workDays, right.workDays)
    && timeRangesOverlap(left.startTime, left.endTime, right.startTime, right.endTime);
}

function dateRangesOverlap(leftStart: string, leftEnd: string | undefined, rightStart: string, rightEnd: string | undefined) {
  const leftEndValue = leftEnd || "9999-12-31";
  const rightEndValue = rightEnd || "9999-12-31";
  return leftStart <= rightEndValue && rightStart <= leftEndValue;
}

function daysOverlap(leftDays: string[], rightDays: string[]) {
  if (!leftDays.length || !rightDays.length) return true;
  const rightSet = new Set(rightDays);
  return leftDays.some((day) => rightSet.has(day));
}

function timeRangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const left = timeRangeToMinutes(leftStart, leftEnd);
  const right = timeRangeToMinutes(rightStart, rightEnd);
  // Para asignacion de personal, un turno que termina exactamente cuando otro inicia
  // tambien se considera cruce operativo porque no deja margen de traslado/cambio.
  return left.some(([leftA, leftB]) => right.some(([rightA, rightB]) => leftA <= rightB && rightA <= leftB));
}

function timeRangeToMinutes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const ranges: [number, number][] = [[startMinutes, endMinutes]];
  if (endMinutes > 24 * 60) ranges.push([0, endMinutes - 24 * 60]);
  return ranges;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
