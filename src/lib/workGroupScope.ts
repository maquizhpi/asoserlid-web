import "server-only";

import { ObjectId, type Document, type Filter } from "mongodb";
import { getCurrentAdminUser } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

export type WorkGroupScope = {
  global: boolean;
  workGroupIds: string[];
  workGroupNames: string[];
};

const globalGroupPattern = /administrativ/i;

export async function getWorkGroupScope(): Promise<WorkGroupScope | null> {
  const user = await getCurrentAdminUser();
  if (!user) return null;
  if (user.roles.includes("administrator") || user.roles.includes("accounting")) {
    return { global: true, workGroupIds: [], workGroupNames: [] };
  }

  const db = await getDb();
  const workerQueries: Filter<Document>[] = [];
  if (user.workerId && ObjectId.isValid(user.workerId)) workerQueries.push({ _id: new ObjectId(user.workerId) });
  if (user.workerDocumentId) workerQueries.push({ documentId: user.workerDocumentId });
  if (user.email) workerQueries.push({ email: user.email });

  const worker = workerQueries.length
    ? await db.collection<Document>("workers").findOne({ $or: workerQueries })
    : null;

  const groupQueries: Filter<Document>[] = [];
  const workerId = worker?._id?.toString() || user.workerId;
  const documentId = String(worker?.documentId || user.workerDocumentId || "");
  if (workerId) groupQueries.push({ legalRepresentativeId: workerId }, { supervisorId: workerId });
  if (documentId) groupQueries.push({ legalRepresentativeDocumentId: documentId });
  if (user.email) groupQueries.push({ companyEmail: user.email });
  if (worker?.workGroupId) groupQueries.push({ _id: new ObjectId(String(worker.workGroupId)) });

  const groups = groupQueries.length
    ? await db.collection<Document>("work_groups").find({ $or: groupQueries }).toArray()
    : [];

  const workGroupIds = new Set<string>();
  const workGroupNames = new Set<string>();
  if (worker?.workGroupId) workGroupIds.add(String(worker.workGroupId));
  if (worker?.workGroupName) workGroupNames.add(String(worker.workGroupName));

  for (const group of groups) {
    if (group._id) workGroupIds.add(group._id.toString());
    const name = String(group.commercialName || group.name || "");
    if (name) workGroupNames.add(name);
  }

  const hasAdministrativeGroup = Array.from(workGroupNames).some((name) => globalGroupPattern.test(name));
  if (hasAdministrativeGroup) return { global: true, workGroupIds: [], workGroupNames: [] };

  return {
    global: false,
    workGroupIds: Array.from(workGroupIds),
    workGroupNames: Array.from(workGroupNames),
  };
}

export function scopedWorkGroupQuery(
  scope: WorkGroupScope,
  idField = "workGroupId",
  nameField = "workGroupName"
): Filter<Document> {
  if (scope.global) return {};

  const clauses: Filter<Document>[] = [];
  if (scope.workGroupIds.length) clauses.push({ [idField]: { $in: scope.workGroupIds } });
  if (scope.workGroupNames.length) clauses.push({ [nameField]: { $in: scope.workGroupNames } });
  if (!clauses.length) return { _id: { $exists: false } };
  return { $or: clauses };
}

export function filterByWorkGroup<T extends Record<string, unknown>>(
  items: T[],
  scope: WorkGroupScope,
  idFields = ["workGroupId"],
  nameFields = ["workGroupName"]
) {
  if (scope.global) return items;
  return items.filter((item) => {
    const hasId = idFields.some((field) => scope.workGroupIds.includes(String(item[field] || "")));
    const hasName = nameFields.some((field) => scope.workGroupNames.includes(String(item[field] || "")));
    return hasId || hasName;
  });
}

export function isRecordInWorkGroupScope(
  record: Record<string, unknown> | null | undefined,
  scope: WorkGroupScope,
  idFields = ["workGroupId"],
  nameFields = ["workGroupName"]
) {
  if (scope.global) return true;
  if (!record) return false;
  return filterByWorkGroup([record], scope, idFields, nameFields).length > 0;
}
