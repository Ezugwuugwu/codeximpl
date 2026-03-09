export function getAuthToken(): string {
  return localStorage.getItem("auth_token") || "";
}

export type AuthRole = "USER" | "ADMIN";

export type AuthSession = {
  token: string;
  email: string;
  displayName: string;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

export type AuthRedirectIntent = "cart" | "checkout";

type JwtPayload = {
  sub?: string;
  role?: string;
  exp?: number;
  name?: string;
  fullName?: string;
  given_name?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAuthSession(): AuthSession {
  const token = getAuthToken();
  if (!token) {
    return {
      token: "",
      email: "",
      displayName: "",
      role: null,
      isAuthenticated: false,
      isAdmin: false,
    };
  }

  const payload = decodeJwtPayload(token);
  const email = typeof payload?.sub === "string" ? payload.sub : "";
  const displayName = typeof payload?.name === "string"
    ? payload.name
    : typeof payload?.fullName === "string"
      ? payload.fullName
      : typeof payload?.given_name === "string"
        ? payload.given_name
        : "";
  const role = payload?.role === "ADMIN" || payload?.role === "USER"
    ? payload.role
    : null;

  return {
    token,
    email,
    displayName,
    role,
    isAuthenticated: Boolean(token),
    isAdmin: role === "ADMIN",
  };
}

export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuthToken(): void {
  localStorage.removeItem("auth_token");
  window.dispatchEvent(new Event("auth-changed"));
}

export function getCurrentUserId(): string {
  return getAuthSession().email;
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 < Date.now();
}

export function sanitizeRedirectTarget(target: string | null | undefined): string | null {
  if (!target) {
    return null;
  }
  if (!target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
}

export function buildAuthEntryPath(
  mode: "login" | "register",
  redirectTo: string,
  intent?: AuthRedirectIntent
): string {
  const params = new URLSearchParams();
  const sanitizedTarget = sanitizeRedirectTarget(redirectTo);
  if (sanitizedTarget) {
    params.set("redirect", sanitizedTarget);
  }
  params.set("reason", "auth-required");
  if (intent) {
    params.set("intent", intent);
  }
  const query = params.toString();
  return `/${mode}${query ? `?${query}` : ""}`;
}
