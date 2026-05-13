export type MachineStatus = "available" | "assigned" | "maintenance" | "inactive";
export type MachineEnvironment = "hospitals" | "public_institutions" | "homes" | "workshops" | "companies" | "other";
export type UserRole =
  | "administrator"
  | "supervisor"
  | "operations"
  | "human_resources"
  | "accounting"
  | "client"
  | "worker";

export type Machine = {
  _id?: string;
  name: string;
  code: string;
  type: string;
  photoUrl?: string;
  photoPublicId?: string;
  environment: MachineEnvironment;
  status: MachineStatus;
  location?: string;
  assignedTo?: string;
  notes?: string;
  usageLogs?: MachineUsageLog[];
  custodyReceipts?: MachineCustodyReceipt[];
  createdAt?: string;
  updatedAt?: string;
};

export type MachineUsageLog = {
  _id?: string;
  date: string;
  usedBy: string;
  clientOrLocation: string;
  startTime: string;
  endTime: string;
  hoursUsed: number;
  conditionBefore: string;
  conditionAfter: string;
  observations?: string;
  createdAt?: string;
};

export type MachineCustodyReceipt = {
  _id?: string;
  date: string;
  deliveredBy: string;
  receivedBy: string;
  origin: string;
  destination: string;
  reason: string;
  expectedReturnDate?: string;
  condition: string;
  documentUrl?: string;
  documentPublicId?: string;
  observations?: string;
  createdAt?: string;
};

export type WorkerIntake = {
  _id?: string;
  documentId: string;
  fullName: string;
  phone: string;
  email?: string;
  position: string;
  address?: string;
  resumeUrl?: string;
  resumePublicId?: string;
  status: "received" | "reviewing" | "accepted" | "rejected";
  approvedWorkerId?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeePosition = {
  _id?: string;
  code: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceType = {
  _id?: string;
  code: string;
  name: string;
  detail: string;
  activities: string;
  imageUrl?: string;
  imagePublicId?: string;
  regularPrice?: number;
  discountPercent?: number;
  offerPrice?: number;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type WorkerDocument = {
  _id?: string;
  workerId?: string;
  workerName: string;
  documentType: string;
  fileUrl?: string;
  filePublicId?: string;
  uploadDate: string;
  expirationDate?: string;
  status: "valid" | "expired" | "pending_review";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminOverviewItem = {
  key: string;
  title: string;
  href: string;
  description: string;
  status: "ready" | "base";
  required: boolean;
  count: number | null;
};

export type AuditLog = {
  _id?: string;
  action: "create" | "update" | "delete";
  moduleKey: string;
  collection: string;
  recordId?: string;
  recordLabel?: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  summary: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  restoredAt?: string;
  restoredBy?: string;
  createdAt?: string;
};

export type GalleryImage = {
  _id?: string;
  title: string;
  category: string;
  imageUrl: string;
  alt?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type CertificationItem = {
  _id?: string;
  title: string;
  issuer?: string;
  category: string;
  fileUrl: string;
  fileType: "image" | "document";
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUser = {
  _id?: string;
  workerId?: string;
  workerDocumentId?: string;
  name: string;
  email: string;
  roles: UserRole[];
  moduleAccess: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUserInput = AdminUser & {
  password?: string;
};

export type Worker = {
  _id?: string;
  documentId: string;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email?: string;
  status: "active" | "inactive";
  documents?: string;
  assignedClientId?: string;
  assignedClient?: string;
  assignedContractId?: string;
  assignedContract?: string;
  assignedArea?: string;
  assignedSchedule?: string;
  supervisor?: string;
  workGroupId?: string;
  workGroupName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkGroup = {
  _id?: string;
  name: string;
  description?: string;
  supervisorId?: string;
  supervisorName?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type Client = {
  _id?: string;
  name: string;
  taxId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceContract = {
  _id?: string;
  clientId?: string;
  clientName: string;
  serviceType: string;
  area?: string;
  shift?: string;
  startDate: string;
  endDate?: string;
  workGroupId?: string;
  workGroupName?: string;
  assignedStaffIds?: string[];
  assignedStaff?: string;
  status: "active" | "paused" | "finished";
  workplaces?: ContractWorkplace[];
  createdAt?: string;
  updatedAt?: string;
};

export type ContractWorkplace = {
  id: string;
  contractId?: string;
  name: string;
  address?: string;
  supervisorId?: string;
  supervisorName?: string;
  status: "active" | "inactive";
  areas: ContractArea[];
};

export type ContractArea = {
  id: string;
  workplaceId?: string;
  name: string;
  description?: string;
  areaType?: string;
  internalLocation?: string;
  cleaningFrequency?: string;
  status: "active" | "inactive";
  shifts: ContractShift[];
};

export type ContractShift = {
  id: string;
  areaId?: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  workDays: string[];
  observation?: string;
  status: "active" | "inactive";
  assignedStaff: AssignedContractStaff[];
};

export type AssignedContractStaff = {
  id: string;
  shiftId?: string;
  workerId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  position: string;
  phone: string;
  assignmentStatus: "active" | "inactive";
  assignmentDate: string;
};

export type SupervisorReport = {
  _id?: string;
  date: string;
  supervisorId?: string;
  supervisor: string;
  workerId?: string;
  workerName: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  workGroupId?: string;
  workGroupName?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  normalHours?: number;
  overtimeHours?: number;
  authorizedOvertimeHours?: number;
  delayMinutes?: number;
  fineAmount?: number;
  permissionHours?: number;
  sicknessHours?: number;
  attendanceStatus: "attended" | "absent" | "permission" | "sick" | "late" | "replacement";
  reportStatus?: "draft" | "submitted" | "observed" | "approved" | "rejected";
  approvalNotes?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplyKit = {
  _id?: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  contractName?: string;
  workplaceId?: string;
  workplaceName?: string;
  productId?: string;
  productCode?: string;
  productCategory?: string;
  unit?: string;
  productName: string;
  items?: SupplyKitItem[];
  quantity: number;
  frequency: string;
  kitPeriod?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type SupplyKitItem = {
  id: string;
  productId?: string;
  productCode?: string;
  productName: string;
  productCategory?: string;
  unit?: string;
  quantity: number;
  notes?: string;
};

export type SupplyProduct = {
  _id?: string;
  code: string;
  auxiliaryCode?: string;
  name: string;
  category: string;
  brand?: string;
  unit: string;
  unitsPerBox?: number;
  stock?: number;
  iva?: string;
  cost?: number;
  salePrice?: number;
  technicalInfo?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type SupplyMovement = {
  _id?: string;
  clientId?: string;
  clientName: string;
  productName: string;
  deliveredQuantity: number;
  consumedQuantity: number;
  pendingQuantity: number;
  movementDate: string;
  responsible: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HiringProcessStatus =
  | "Planificado"
  | "En seguimiento"
  | "Por vencer"
  | "Vencido"
  | "Adjudicado"
  | "Desierto"
  | "Cancelado"
  | "Finalizado";

export type CronogramaFecha = {
  id: string;
  tipoFecha: string;
  fechaHora: string;
  descripcion: string;
  estado: "Pendiente" | "Hoy" | "Proxima" | "Vencida" | "Cumplida";
  observacion?: string;
};

export type AgendaActividad = {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaHoraInicio: string;
  fechaHoraFin?: string;
  responsable?: string;
  prioridad: "Alta" | "Media" | "Baja";
  estado: "Pendiente" | "En proceso" | "Cumplido" | "Vencido" | "Reprogramado";
  origen: "Automatico" | "Manual";
  procesoRelacionado?: string;
  observaciones?: string;
  fechaCumplimiento?: string;
};

export type HiringProcessFile = {
  id: string;
  nombre: string;
  url?: string;
  tipo?: string;
  observacion?: string;
  createdAt?: string;
};

export type HiringProcess = {
  _id?: string;
  numeroProceso: string;
  entidadCliente: string;
  objetoProceso: string;
  tipoCompra?: string;
  presupuestoReferencialSinIva?: number;
  tipoContratacion?: string;
  formaPago?: string;
  tipoAdjudicacion?: string;
  plazoEntregaDias?: number;
  vigenciaOfertaDias?: number;
  funcionarioEncargado?: string;
  areaResponsable: string;
  estadoProceso: HiringProcessStatus;
  descripcion?: string;
  notas?: string;
  fechaInicio: string;
  fechaVencimiento: string;
  cronograma: CronogramaFecha[];
  agendaOperacional: AgendaActividad[];
  archivos?: HiringProcessFile[];
  processNumber?: string;
  title?: string;
  clientName?: string;
  area?: string;
  startDate: string;
  dueDate: string;
  status: "planned" | "in_progress" | "paused" | "completed" | "cancelled";
  timeline?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InternalNotification = {
  _id?: string;
  title: string;
  role: UserRole | "all";
  message: string;
  dueDate?: string;
  status: "active" | "read" | "archived";
  createdAt?: string;
  updatedAt?: string;
};
