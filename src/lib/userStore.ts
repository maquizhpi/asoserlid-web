import "server-only";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getDefaultAccessForRoles, getEffectiveModuleAccess } from "@/lib/roleAccess";
import { roleLabels, userRoles } from "@/lib/userRoles";
import type { AdminUser } from "@/types/admin";

const usersCollection = "users";

const userInputSchema = z.object({
  workerId: z.string().trim().optional().or(z.literal("")),
  workerDocumentId: z.string().trim().optional().or(z.literal("")),
  name: z.string().min(2, "El nombre es obligatorio.").trim(),
  email: z.string().email("El correo no es valido.").trim().toLowerCase(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres.").optional().or(z.literal("")),
  roles: z.array(z.enum(userRoles)).min(1, "Selecciona al menos un rol."),
  moduleAccess: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

type UserDocument = Omit<AdminUser, "_id" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export function getRoleOptions() {
  return userRoles.map((value) => ({ value, label: roleLabels[value] }));
}

export async function ensureDefaultAdminUser() {
  const db = await getDb();
  await db.collection<UserDocument>(usersCollection).createIndex({ email: 1 }, { unique: true });

  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@asoserlid.com");
  const existing = await db.collection<UserDocument>(usersCollection).findOne({ email });
  if (existing) return serializeUser(existing);

  const password = process.env.ADMIN_PASSWORD || process.env.BLOG_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("Falta configurar ADMIN_PASSWORD para crear el usuario administrador.");
  }
  const now = new Date();
  const adminUser: UserDocument = {
    name: "Administrador ASOSERLID",
    email,
    passwordHash: await hashPassword(password),
    roles: ["administrator"],
    moduleAccess: getDefaultAccessForRoles(["administrator"]),
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<UserDocument>(usersCollection).insertOne(adminUser);
  return serializeUser({ ...adminUser, _id: result.insertedId });
}

export async function validateUserCredentials(emailInput: string, password: string) {
  await ensureDefaultAdminUser();

  const email = normalizeEmail(emailInput);
  if (!email || !password) return null;

  const db = await getDb();
  const user = await db.collection<UserDocument>(usersCollection).findOne({ email, active: true });
  if (!user) return null;

  const result = await verifyPassword(password, user.passwordHash);
  if (!result.valid) return null;

  if (result.needsRehash && user._id) {
    await db.collection<UserDocument>(usersCollection).updateOne(
      { _id: user._id },
      { $set: { passwordHash: await hashPassword(password), updatedAt: new Date() } }
    );
  }

  const effectiveAccess = getEffectiveModuleAccess(user.roles, user.moduleAccess);
  if (user._id && !sameStringSet(effectiveAccess, user.moduleAccess)) {
    await db.collection<UserDocument>(usersCollection).updateOne(
      { _id: user._id },
      { $set: { moduleAccess: effectiveAccess, updatedAt: new Date() } }
    );
    user.moduleAccess = effectiveAccess;
  }

  return serializeUser(user);
}

export async function getUsers() {
  await ensureDefaultAdminUser();
  const db = await getDb();
  const users = await db.collection<UserDocument>(usersCollection).find().sort({ createdAt: -1 }).toArray();
  return users.map(serializeUser);
}

export async function getUserSummaries() {
  await ensureDefaultAdminUser();
  const db = await getDb();
  const users = await db
    .collection<UserDocument>(usersCollection)
    .find({}, { projection: { name: 1, email: 1, roles: 1, active: 1, createdAt: 1, updatedAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();

  return users.map((user) => ({
    _id: user._id?.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function getUserById(id: string) {
  await ensureDefaultAdminUser();
  if (!ObjectId.isValid(id)) return null;

  const db = await getDb();
  const user = await db.collection<UserDocument>(usersCollection).findOne({ _id: new ObjectId(id) });
  return user ? serializeUser(user) : null;
}

export async function createUser(input: unknown) {
  const data = normalizeUserInput(userInputSchema.parse(input));
  if (!data.password) {
    throw new Error("La contrasena es obligatoria para crear usuarios.");
  }

  const db = await getDb();
  await db.collection<UserDocument>(usersCollection).createIndex({ email: 1 }, { unique: true });

  const now = new Date();
  const user: UserDocument = {
    workerId: data.workerId,
    workerDocumentId: data.workerDocumentId,
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    roles: data.roles,
    moduleAccess: data.moduleAccess,
    active: data.active,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await db.collection<UserDocument>(usersCollection).insertOne(user);
    return serializeUser({ ...user, _id: result.insertedId });
  } catch (error) {
    if (isDuplicateKey(error)) throw new Error("Ya existe un usuario con ese correo.");
    throw error;
  }
}

export async function updateUser(id: string, input: unknown) {
  const data = normalizeUserInput(userInputSchema.parse(input));
  const db = await getDb();
  const update: Partial<UserDocument> = {
    workerId: data.workerId,
    workerDocumentId: data.workerDocumentId,
    name: data.name,
    email: data.email,
    roles: data.roles,
    moduleAccess: data.moduleAccess,
    active: data.active,
    updatedAt: new Date(),
  };

  if (data.password) {
    update.passwordHash = await hashPassword(data.password);
  }

  try {
    const result = await db
      .collection<UserDocument>(usersCollection)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: "after" });
    return result ? serializeUser(result) : null;
  } catch (error) {
    if (isDuplicateKey(error)) throw new Error("Ya existe un usuario con ese correo.");
    throw error;
  }
}

export async function changeUserPassword(id: string, currentPassword: string, nextPassword: string) {
  if (!ObjectId.isValid(id)) throw new Error("Usuario no valido.");
  if (!currentPassword) throw new Error("Ingresa la contrasena actual.");
  if (!nextPassword || nextPassword.length < 8) throw new Error("La nueva contrasena debe tener al menos 8 caracteres.");

  const db = await getDb();
  const user = await db.collection<UserDocument>(usersCollection).findOne({ _id: new ObjectId(id), active: true });
  if (!user) throw new Error("Usuario no encontrado.");

  const result = await verifyPassword(currentPassword, user.passwordHash);
  if (!result.valid) throw new Error("La contrasena actual no es correcta.");

  await db.collection<UserDocument>(usersCollection).updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(nextPassword), updatedAt: new Date() } }
  );

  return true;
}

export async function deleteUser(id: string) {
  const db = await getDb();
  const user = await db.collection<UserDocument>(usersCollection).findOne({ _id: new ObjectId(id) });
  if (user?.roles.includes("administrator")) {
    const admins = await db.collection<UserDocument>(usersCollection).countDocuments({
      roles: "administrator",
      active: true,
    });
    if (admins <= 1) throw new Error("Debe existir al menos un administrador activo.");
  }

  const result = await db.collection<UserDocument>(usersCollection).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export function getUserStoreErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }

  if (error instanceof Error) return error.message;
  return "No se pudo completar la accion.";
}

function normalizeUserInput(user: z.infer<typeof userInputSchema>) {
  return {
    ...user,
    email: normalizeEmail(user.email),
    password: user.password || undefined,
    moduleAccess: getEffectiveModuleAccess(user.roles, user.moduleAccess),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeUser(user: UserDocument): AdminUser {
  return {
    _id: user._id?.toString(),
    workerId: user.workerId,
    workerDocumentId: user.workerDocumentId,
    name: user.name,
    email: user.email,
    roles: user.roles,
    moduleAccess: getEffectiveModuleAccess(user.roles, user.moduleAccess),
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function sameStringSet(left: string[], right: string[] = []) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
