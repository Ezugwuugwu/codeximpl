export function getAuthToken(): string {
  return localStorage.getItem("auth_token") || "";
}

type JwtPayload = {
  sub?: string;
  role?: string;
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string {
  const token = getAuthToken();
  if (!token) {
    return "";
  }
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === "string" ? payload.sub : "";
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 < Date.now();
}
