export type MachineStatus = "available" | "assigned" | "maintenance" | "inactive";
export type MachineEnvironment = "hospitals" | "public_institutions" | "homes" | "workshops" | "companies" | "other";
export type UserRole =
  | "administrator"
  | "supervisor"
  | "operations"
  | "human_resources"
  | "accounting"
  | "advertising"
  | "legal_representative"
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
  ownerWorkGroupId?: string;
  ownerWorkGroupName?: string;
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
  photoUrl?: string;
  photoPublicId?: string;
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
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
  talentProfile?: TalentHumanProfile;
  eppDelivery?: EppDeliveryProfile;
  createdAt?: string;
  updatedAt?: string;
};

export type EppDeliveryProfile = {
  completed?: boolean;
  deliveryDate?: string;
  period?: string;
  employer?: string;
  contractId?: string;
  contractName?: string;
  workplace?: string;
  representativeName?: string;
  observations?: string;
  items?: EppDeliveryItem[];
  generatedAt?: string;
};

export type EppDeliveryItem = {
  id: string;
  name: string;
  quantity?: number;
  delivered?: boolean;
  notes?: string;
};

export type TalentHumanProfile = {
  completed?: boolean;
  completedAt?: string;
  currentDate?: string;
  birthDate?: string;
  age?: number;
  civilStatus?: string;
  homePhone?: string;
  hasConadisCard?: string;
  bloodType?: string;
  experienceYears?: number;
  province?: string;
  canton?: string;
  parish?: string;
  zone?: string;
  mainStreet?: string;
  secondaryStreet?: string;
  houseNumber?: string;
  shirtSize?: string;
  pantsSize?: string;
  shoeSize?: string;
  familyLoads?: TalentFamilyLoad[];
  education?: TalentEducation[];
  mainCourses?: string;
  additionalKnowledge?: string;
  workHistory?: TalentWorkHistory[];
  trainings?: TalentTraining[];
  personalReferences?: TalentPersonalReference[];
  declarationAccepted?: boolean;
};

export type TalentFamilyLoad = {
  id: string;
  type: string;
  fullName: string;
  documentId?: string;
  birthDate?: string;
  age?: number;
  conadisCard?: string;
};

export type TalentEducation = {
  id: string;
  level: string;
  completed?: string;
  institution?: string;
  title?: string;
};

export type TalentWorkHistory = {
  id: string;
  position?: string;
  employer?: string;
  workTime?: string;
  startDate?: string;
  endDate?: string;
  phone?: string;
  exitReason?: string;
};

export type TalentTraining = {
  id: string;
  name: string;
  description?: string;
  placeOrCompany?: string;
  date?: string;
};

export type TalentPersonalReference = {
  id: string;
  name: string;
  relationship?: string;
  phone?: string;
  residence?: string;
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
  contractNumber?: string;
  contractAdministrator?: string;
  contractAdministratorEmail?: string;
  contractAdministratorPhone?: string;
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
  lunchBreakMinutes?: number;
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
  period?: string;
  supervisorId?: string;
  supervisor: string;
  workerId?: string;
  workerName: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  contractName?: string;
  workplaceId?: string;
  workplaceName?: string;
  areaId?: string;
  areaName?: string;
  shiftId?: string;
  shiftName?: string;
  workGroupId?: string;
  workGroupName?: string;
  startTime?: string;
  endTime?: string;
  lunchBreakMinutes?: number;
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
  staffReports?: SupervisorReportStaff[];
  createdAt?: string;
  updatedAt?: string;
};

export type SupervisorReportStaff = {
  id: string;
  workerId: string;
  workerName: string;
  documentId?: string;
  position?: string;
  startTime?: string;
  endTime?: string;
  lunchBreakMinutes?: number;
  totalHours?: number;
  normalHours?: number;
  overtimeHours?: number;
  authorizedOvertimeHours?: number;
  delayMinutes?: number;
  fineAmount?: number;
  permissionHours?: number;
  sicknessHours?: number;
  attendanceStatus: "attended" | "absent" | "permission" | "sick" | "late" | "replacement";
  supportDocumentSubject?: string;
  supportDocumentUrl?: string;
  supportDocumentPublicId?: string;
  supportDocumentName?: string;
  notes?: string;
};

export type SupplyKit = {
  _id?: string;
  kitCode?: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  contractName?: string;
  workplaceId?: string;
  workplaceName?: string;
  supervisorId?: string;
  supervisorName?: string;
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

export type SupplyKitDelivery = {
  _id?: string;
  kitId: string;
  kitCode?: string;
  period: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  contractName?: string;
  workplaceId?: string;
  workplaceName?: string;
  supervisorId?: string;
  supervisorName?: string;
  items: SupplyKitDeliveryItem[];
  totalQuantity: number;
  responsible?: string;
  deliveryDate: string;
  notes?: string;
  status: "draft" | "delivered" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
};

export type SupplyKitDeliveryItem = SupplyKitItem & {
  source: "base" | "extra";
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
    workGroupId?: string;
    workGroupName?: string;
    processOwner?: string;
    estadoProceso: HiringProcessStatus;
    winningCompany?: string;
    winningPrice?: number;
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
  acknowledgedBy?: string[];
  createdAt?: string;
  updatedAt?: string;
};
