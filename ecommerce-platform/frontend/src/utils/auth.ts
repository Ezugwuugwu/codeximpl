export const AUTH_TOKEN_STORAGE_KEY = "auth_token";
export const GUEST_SESSION_STORAGE_KEY = "okanga_guest_session_active";

function dispatchAuthChange() {
  window.dispatchEvent(new Event("auth-changed"));
}

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

export type AuthRole = "USER" | "ADMIN";

export type AuthSession = {
  token: string;
  email: string;
  displayName: string;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  hasShoppingAccess: boolean;
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
    const isGuest = isGuestSessionActive();
    return {
      token: "",
      email: "",
      displayName: isGuest ? "Guest Checkout" : "",
      role: null,
      isAuthenticated: false,
      isAdmin: false,
      isGuest,
      hasShoppingAccess: isGuest,
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
    isGuest: false,
    hasShoppingAccess: true,
  };
}

export function setAuthToken(token: string): void {
  localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  dispatchAuthChange();
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  dispatchAuthChange();
}

export function isGuestSessionActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(GUEST_SESSION_STORAGE_KEY) === "true";
}

export function activateGuestSession(): void {
  localStorage.setItem(GUEST_SESSION_STORAGE_KEY, "true");
  dispatchAuthChange();
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
  dispatchAuthChange();
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
