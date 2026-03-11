const commonEmailDomainCorrections: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
};

const knownEmailDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com"];

export function getEmailSuggestion(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  const atCount = normalized.split("@").length - 1;
  if (atCount !== 1) {
    return normalized !== value ? normalized : null;
  }

  const [rawLocalPart = "", rawDomain = ""] = normalized.split("@");
  if (!rawLocalPart || !rawDomain) {
    return normalized !== value ? normalized : null;
  }

  const localPart = rawLocalPart.replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".");
  let domain = commonEmailDomainCorrections[rawDomain] ?? rawDomain;
  if (!domain.includes(".")) {
    const partialMatch = knownEmailDomains.find((candidate) => candidate.startsWith(domain));
    if (partialMatch) {
      domain = partialMatch;
    }
  }

  const suggestion = `${localPart}@${domain}`;
  return suggestion !== normalized ? suggestion : null;
}

export function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(normalized)) {
    return false;
  }

  const [localPart = "", domain = ""] = normalized.split("@");
  return !(
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  );
}

export function formatAddressSuggestion(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const suggestion = normalized
    .split(/([,/-]|\s+)/)
    .map((segment) => {
      if (!segment || /^[,\s/-]+$/.test(segment) || !/[A-Za-z]/.test(segment)) {
        return segment;
      }
      if (segment.length <= 3 && segment === segment.toUpperCase()) {
        return segment;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join("");

  return suggestion !== value ? suggestion : null;
}

export function isValidStreetAddress(value: string): boolean {
  const normalized = value.trim();
  return normalized.length >= 10 && normalized.split(/\s+/).filter(Boolean).length >= 2 && /[A-Za-z]/.test(normalized);
}

export function formatPlaceSuggestion(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const suggestion = normalized
    .split(" ")
    .map((part) => {
      if (!part) {
        return part;
      }
      if (part.length <= 3 && part === part.toUpperCase()) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");

  return suggestion !== value ? suggestion : null;
}

export function getPostalCodeSuggestion(value: string): string | null {
  const suggestion = value.trim().replace(/\s+/g, " ").toUpperCase();
  return suggestion && suggestion !== value ? suggestion : null;
}
