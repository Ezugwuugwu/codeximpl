export type CountryOption = {
  name: string;
  iso2: string;
  iso3: string;
};

export type StateOption = {
  name: string;
  code: string;
};

export type StreetAddressSuggestion = {
  id: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

type CountriesNowEnvelope<T> = {
  error: boolean;
  msg: string;
  data: T;
};

type CountryPositionRecord = {
  name?: string;
  iso2?: string;
  iso3?: string;
};

type CountryStatesRecord = {
  name?: string;
  iso2?: string;
  iso3?: string;
  states?: Array<{
    name?: string;
    state_code?: string | null;
  }>;
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string | number;
    city?: string;
    district?: string;
    county?: string;
    locality?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

const countriesNowBaseUrl = "https://countriesnow.space/api/v0.1";
const photonBaseUrl = "https://photon.komoot.io/api";

let countriesCache: CountryOption[] | null = null;
let countriesPromise: Promise<CountryOption[]> | null = null;
let statesCache: Map<string, StateOption[]> | null = null;
let statesPromise: Promise<Map<string, StateOption[]>> | null = null;
const cityCache = new Map<string, string[]>();

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

function normalizeComparableLocation(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function locationsMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeComparableLocation(left);
  const normalizedRight = normalizeComparableLocation(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export async function listCountries(): Promise<CountryOption[]> {
  if (countriesCache) {
    return countriesCache;
  }
  if (countriesPromise) {
    return countriesPromise;
  }

  countriesPromise = fetchJson<CountriesNowEnvelope<CountryPositionRecord[]>>(`${countriesNowBaseUrl}/countries/positions`)
    .then((payload) => {
      const parsedCountries = sortByName(
        (Array.isArray(payload.data) ? payload.data : [])
          .map((entry) => ({
            name: entry.name?.trim() ?? "",
            iso2: entry.iso2?.trim() ?? "",
            iso3: entry.iso3?.trim() ?? "",
          }))
          .filter((entry) => entry.name.length > 0)
      );
      countriesCache = parsedCountries;
      return parsedCountries;
    })
    .finally(() => {
      countriesPromise = null;
    });

  return countriesPromise;
}

async function listStatesDirectory(): Promise<Map<string, StateOption[]>> {
  if (statesCache) {
    return statesCache;
  }
  if (statesPromise) {
    return statesPromise;
  }

  statesPromise = fetchJson<CountriesNowEnvelope<CountryStatesRecord[]>>(`${countriesNowBaseUrl}/countries/states`)
    .then((payload) => {
      const directory = new Map<string, StateOption[]>();
      const countries = Array.isArray(payload.data) ? payload.data : [];

      countries.forEach((country) => {
        const countryName = country.name?.trim();
        if (!countryName) {
          return;
        }

        const states = sortByName(
          (Array.isArray(country.states) ? country.states : [])
            .map((state) => ({
              name: state.name?.trim() ?? "",
              code: state.state_code?.trim() ?? "",
            }))
            .filter((state) => state.name.length > 0)
        );

        directory.set(normalizeText(countryName), states);
      });

      statesCache = directory;
      return directory;
    })
    .finally(() => {
      statesPromise = null;
    });

  return statesPromise;
}

export async function listStates(country: string): Promise<StateOption[]> {
  const normalizedCountry = normalizeText(country);
  if (!normalizedCountry) {
    return [];
  }

  const directory = await listStatesDirectory();
  return directory.get(normalizedCountry) ?? [];
}

export async function listCities(country: string, state: string): Promise<string[]> {
  const normalizedCountry = normalizeText(country);
  const normalizedState = normalizeText(state);
  if (!normalizedCountry || !normalizedState) {
    return [];
  }

  const cacheKey = `${normalizedCountry}::${normalizedState}`;
  const cached = cityCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(`${countriesNowBaseUrl}/countries/state/cities/q`);
  url.searchParams.set("country", country.trim());
  url.searchParams.set("state", state.trim());

  const payload = await fetchJson<CountriesNowEnvelope<string[]>>(url.toString());
  const cities = [...new Set((Array.isArray(payload.data) ? payload.data : []).map((entry) => entry.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );

  cityCache.set(cacheKey, cities);
  return cities;
}

function buildSuggestionLabel(parts: string[]): string {
  return parts.filter((part) => part.trim().length > 0).join(", ");
}

function parsePhotonSuggestion(feature: PhotonFeature): StreetAddressSuggestion | null {
  const properties = feature.properties;
  if (!properties) {
    return null;
  }

  const houseNumber = String(properties.housenumber ?? "").trim();
  const streetName = properties.street?.trim() || properties.name?.trim() || "";
  const streetAddress = [houseNumber, streetName].filter(Boolean).join(" ").trim();
  const city = properties.city?.trim() || properties.locality?.trim() || properties.district?.trim() || properties.county?.trim() || "";
  const state = properties.state?.trim() || "";
  const country = properties.country?.trim() || "";
  const postalCode = properties.postcode?.trim() || "";

  if (!streetAddress || !country) {
    return null;
  }

  const label = buildSuggestionLabel([
    streetAddress,
    city,
    state,
    country,
    postalCode,
  ]);

  return {
    id: [streetAddress, city, state, country, postalCode].join("|"),
    label,
    streetAddress,
    city,
    state,
    country,
    postalCode,
  };
}

export async function searchStreetAddresses(
  query: string,
  location: {
    country: string;
    state?: string;
    city?: string;
  },
  signal?: AbortSignal
): Promise<StreetAddressSuggestion[]> {
  const trimmedQuery = query.trim();
  const trimmedCountry = location.country.trim();
  if (trimmedQuery.length < 3 || !trimmedCountry) {
    return [];
  }

  const url = new URL(photonBaseUrl);
  url.searchParams.set(
    "q",
    [trimmedQuery, location.city?.trim() ?? "", location.state?.trim() ?? "", trimmedCountry]
      .filter((part) => part.length > 0)
      .join(", ")
  );
  url.searchParams.set("limit", "10");
  url.searchParams.set("lang", "en");

  const payload = await fetchJson<{ features?: PhotonFeature[] }>(url.toString(), signal);
  const normalizedQuery = normalizeText(trimmedQuery);
  const suggestions = (Array.isArray(payload.features) ? payload.features : [])
    .map(parsePhotonSuggestion)
    .filter((suggestion): suggestion is StreetAddressSuggestion => Boolean(suggestion))
    .filter((suggestion) => {
      if (!locationsMatch(suggestion.country, trimmedCountry)) {
        return false;
      }
      if (location.state?.trim() && !locationsMatch(suggestion.state, location.state)) {
        return false;
      }
      if (location.city?.trim() && !locationsMatch(suggestion.city, location.city)) {
        return false;
      }
      return true;
    })
    .filter((suggestion) => {
      const street = normalizeText(suggestion.streetAddress);
      const label = normalizeText(suggestion.label);
      return street.startsWith(normalizedQuery) || label.startsWith(normalizedQuery);
    });

  return suggestions.filter((suggestion, index, collection) => collection.findIndex((entry) => entry.id === suggestion.id) === index).slice(0, 5);
}
