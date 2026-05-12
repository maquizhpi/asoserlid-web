import "server-only";

export type CivilRegistryPerson = {
  documentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
};

export async function lookupCivilRegistryPerson(documentId: string): Promise<CivilRegistryPerson> {
  const cleanDocumentId = documentId.trim();
  if (!/^\d{10}$/.test(cleanDocumentId)) {
    throw new Error("Ingresa una cedula valida de 10 digitos.");
  }

  const apiUrl = process.env.CIVIL_REGISTRY_API_URL;
  if (!apiUrl) {
    throw new Error("Falta configurar CIVIL_REGISTRY_API_URL con el endpoint autorizado del Registro Civil o proveedor contratado.");
  }

  const url = apiUrl.replace("{cedula}", encodeURIComponent(cleanDocumentId)).replace("{documentId}", encodeURIComponent(cleanDocumentId));
  const headers: HeadersInit = { Accept: "application/json" };
  const apiKey = process.env.CIVIL_REGISTRY_API_KEY;

  if (apiKey) {
    const header = process.env.CIVIL_REGISTRY_AUTH_HEADER || "Authorization";
    const scheme = process.env.CIVIL_REGISTRY_AUTH_SCHEME || "Bearer";
    headers[header] = header.toLowerCase() === "authorization" ? `${scheme} ${apiKey}` : apiKey;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(getErrorMessage(json) || "No se pudo consultar la cedula.");
  }

  return normalizePerson(cleanDocumentId, json);
}

function normalizePerson(documentId: string, payload: unknown): CivilRegistryPerson {
  const data = unwrapPayload(payload);
  const fullName =
    readString(data, ["fullName", "nombreCompleto", "nombre_completo", "nombres", "nombre", "name"]) ||
    "";

  if (!fullName) {
    throw new Error("La respuesta no contiene nombres de la persona.");
  }

  const firstName = readString(data, ["firstName", "nombresPersona", "nombres_persona", "givenName"]);
  const lastName = readString(data, ["lastName", "apellidos", "apellidosPersona", "surname"]);
  const split = splitEcuadorianFullName(fullName);

  return {
    documentId,
    firstName: firstName || split.firstName,
    lastName: lastName || split.lastName,
    fullName,
    birthDate: readString(data, ["birthDate", "fechaNacimiento", "fecha_nacimiento"]),
    gender: readString(data, ["gender", "sexo"]),
    maritalStatus: readString(data, ["maritalStatus", "estadoCivil", "estado_civil"]),
    nationality: readString(data, ["nationality", "nacionalidad"]),
  };
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const nested = record.data || record.persona || record.person || record.result || record.resultado;
  return nested && typeof nested === "object" ? (nested as Record<string, unknown>) : record;
}

function readString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function splitEcuadorianFullName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length <= 2) {
    return { firstName: fullName, lastName: "" };
  }

  return {
    lastName: parts.slice(0, 2).join(" "),
    firstName: parts.slice(2).join(" "),
  };
}

function getErrorMessage(payload: unknown) {
  const data = unwrapPayload(payload);
  return readString(data, ["error", "message", "mensaje", "detail"]);
}

