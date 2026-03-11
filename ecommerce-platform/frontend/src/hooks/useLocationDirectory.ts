import { useEffect, useState } from "react";
import {
  listCities,
  listCountries,
  listStates,
  searchStreetAddresses,
  type CountryOption,
  type StateOption,
  type StreetAddressSuggestion,
} from "../services/locationService";

export function useLocationDirectory(country: string, state: string) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let active = true;
    setCountriesLoading(true);

    listCountries()
      .then((result) => {
        if (!active) {
          return;
        }
        setCountries(result);
        setLocationError("");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setLocationError("Could not load the country list right now.");
      })
      .finally(() => {
        if (active) {
          setCountriesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!country.trim()) {
      setStates([]);
      setCities([]);
      setStatesLoading(false);
      setCitiesLoading(false);
      return () => {
        active = false;
      };
    }

    setStatesLoading(true);
    setCities([]);

    listStates(country)
      .then((result) => {
        if (!active) {
          return;
        }
        setStates(result);
        setLocationError("");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setStates([]);
        setLocationError("Could not load states for the selected country.");
      })
      .finally(() => {
        if (active) {
          setStatesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [country]);

  useEffect(() => {
    let active = true;
    if (!country.trim() || !state.trim()) {
      setCities([]);
      setCitiesLoading(false);
      return () => {
        active = false;
      };
    }

    setCitiesLoading(true);

    listCities(country, state)
      .then((result) => {
        if (!active) {
          return;
        }
        setCities(result);
        setLocationError("");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setCities([]);
        setLocationError("Could not load cities for the selected state.");
      })
      .finally(() => {
        if (active) {
          setCitiesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [country, state]);

  return {
    countries,
    states,
    cities,
    countriesLoading,
    statesLoading,
    citiesLoading,
    locationError,
  };
}

export function useStreetAddressSuggestions(query: string, location: { country: string; state: string; city: string }) {
  const [suggestions, setSuggestions] = useState<StreetAddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmedQuery = query.trim();
    const trimmedCountry = location.country.trim();

    if (trimmedQuery.length < 3 || !trimmedCountry) {
      setSuggestions([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);

      searchStreetAddresses(
        trimmedQuery,
        {
          country: trimmedCountry,
          state: location.state.trim(),
          city: location.city.trim(),
        },
        controller.signal
      )
        .then((result) => {
          setSuggestions(result);
          setError("");
        })
        .catch((reason) => {
          if (reason instanceof DOMException && reason.name === "AbortError") {
            return;
          }
          setSuggestions([]);
          setError("Could not load address suggestions right now.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [location.city, location.country, location.state, query]);

  return {
    suggestions,
    loading,
    error,
  };
}
