import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocationDirectory, useStreetAddressSuggestions } from "../../hooks/useLocationDirectory";
import { userApi } from "../../services/api";
import type { UserAddress, UserAddressUpsertRequest } from "../../types";
import { isValidStreetAddress } from "../../utils/contactValidation";

type AddressBookSectionProps = {
  token: string;
  onAddressesChanged?: () => Promise<void> | void;
};

const emptyForm: UserAddressUpsertRequest = {
  label: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Nigeria",
  defaultAddress: false,
};

function formatAddress(address: UserAddress): string[] {
  return [
    address.streetAddress,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
  ].filter((line) => line.trim().length > 0);
}

function AddressBookSection({ token, onAddressesChanged }: AddressBookSectionProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [form, setForm] = useState<UserAddressUpsertRequest>(emptyForm);
  const { countries, states, cities, countriesLoading, statesLoading, citiesLoading, locationError } = useLocationDirectory(
    form.country,
    form.state
  );
  const {
    suggestions: streetSuggestions,
    loading: streetSuggestionsLoading,
    error: streetSuggestionsError,
  } = useStreetAddressSuggestions(form.streetAddress, {
    country: form.country,
    state: form.state,
    city: form.city,
  });

  const hasExistingAddresses = addresses.length > 0;
  const activeAddress = useMemo(
    () => addresses.find((address) => address.id === editingAddressId) ?? null,
    [addresses, editingAddressId]
  );

  const focusAddressForm = () => {
    window.setTimeout(() => {
      const target = document.getElementById("address-label");
      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
  };

  const loadAddresses = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await userApi.listAddresses(token);
      setAddresses(result);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "We could not load your saved addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses().catch(() => undefined);
  }, [token]);

  const openCreateForm = () => {
    setEditingAddressId(null);
    setForm({
      ...emptyForm,
      defaultAddress: !hasExistingAddresses,
    });
    setError("");
    setSuccess("");
    setIsFormOpen(true);
    focusAddressForm();
  };

  const openEditForm = (address: UserAddress) => {
    setEditingAddressId(address.id);
    setForm({
      label: address.label,
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      defaultAddress: address.defaultAddress,
    });
    setError("");
    setSuccess("");
    setIsFormOpen(true);
    focusAddressForm();
  };

  const closeForm = () => {
    setEditingAddressId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const updateCountry = (value: string) => {
    setForm((current) => ({
      ...current,
      country: value,
      state: "",
      city: "",
    }));
  };

  const updateState = (value: string) => {
    setForm((current) => ({
      ...current,
      state: value,
      city: "",
    }));
  };

  const applyStreetSuggestion = (streetAddress: string, postalCode: string) => {
    setForm((current) => ({
      ...current,
      streetAddress,
      postalCode: postalCode || current.postalCode,
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formElement = formRef.current;
    if (formElement && !formElement.reportValidity()) {
      setError("Please correct the highlighted address fields.");
      return;
    }
    if (!form.label.trim() || !form.streetAddress.trim() || !form.city.trim() || !form.state.trim() || !form.country.trim()) {
      setError("Label, street address, city, state, and country are required.");
      return;
    }
    if (!isValidStreetAddress(form.streetAddress)) {
      setError("Enter a complete delivery address.");
      return;
    }

    setSaving(true);
    try {
      if (editingAddressId) {
        await userApi.updateAddress(token, editingAddressId, {
          ...form,
          label: form.label.trim(),
          streetAddress: form.streetAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
        });
        setSuccess("Address updated successfully.");
      } else {
        await userApi.createAddress(token, {
          ...form,
          label: form.label.trim(),
          streetAddress: form.streetAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
        });
        setSuccess("Address added successfully.");
      }

      closeForm();
      await loadAddresses();
      await onAddressesChanged?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Address update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address: UserAddress) => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await userApi.setDefaultAddress(token, address.id);
      setSuccess(`"${address.label}" is now your default delivery address.`);
      await loadAddresses();
      await onAddressesChanged?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Could not update the default address.");
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (address: UserAddress) => {
    const confirmed = window.confirm(`Delete the address "${address.label}"?`);
    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await userApi.deleteAddress(token, address.id);
      setSuccess(`"${address.label}" has been removed.`);
      if (editingAddressId === address.id) {
        closeForm();
      }
      await loadAddresses();
      await onAddressesChanged?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Could not delete this address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="address-section"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#f5fbff] p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Addresses</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Address book</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add, edit, and choose the delivery addresses your orders should use.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          type="button"
          onClick={openCreateForm}
        >
          Add address
        </button>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      {isFormOpen && (
        <form className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5" onSubmit={onSubmit} ref={formRef}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeAddress ? `Edit ${activeAddress.label}` : "Add a new address"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Save a reusable delivery location for checkout.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white"
              type="button"
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-label">
                Label
              </label>
              <input
                autoComplete="organization"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-label"
                maxLength={80}
                placeholder="Home, Office, Parents..."
                type="text"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </div>

            <label className="sm:col-span-2" htmlFor="address-country">
              <span className="mb-1 block text-sm font-medium text-slate-700">Country</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none disabled:bg-slate-100"
                disabled={countriesLoading || countries.length === 0}
                id="address-country"
                required
                value={form.country}
                onChange={(event) => updateCountry(event.target.value)}
              >
                <option value="">{countriesLoading ? "Loading countries..." : "Select country"}</option>
                {countries.map((country) => (
                  <option key={country.iso2 || country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">Choose the delivery country first. The state and city lists are loaded from that country.</p>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-state">
                State / Region
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none disabled:bg-slate-100"
                disabled={!form.country || statesLoading || states.length === 0}
                id="address-state"
                required
                value={form.state}
                onChange={(event) => updateState(event.target.value)}
              >
                <option value="">
                  {!form.country ? "Select country first" : statesLoading ? "Loading states..." : "Select state"}
                </option>
                {states.map((state) => (
                  <option key={`${state.code}-${state.name}`} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-city">
                City
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none disabled:bg-slate-100"
                disabled={!form.country || !form.state || citiesLoading || cities.length === 0}
                id="address-city"
                required
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              >
                <option value="">
                  {!form.country
                    ? "Select country first"
                    : !form.state
                      ? "Select state first"
                      : citiesLoading
                        ? "Loading cities..."
                        : "Select city"}
                </option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-postal-code">
                Postal code
              </label>
              <input
                autoComplete="postal-code"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-postal-code"
                maxLength={40}
                pattern="[A-Za-z0-9][A-Za-z0-9 -]{2,11}"
                title="Enter a valid postal code."
                type="text"
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-street">
              Street address
            </label>
            <input
              autoComplete="street-address"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
              id="address-street"
              maxLength={255}
              minLength={10}
              placeholder={form.city ? `Start typing an address in ${form.city}` : "Start typing your street address"}
              required
              title="Enter a complete delivery address."
              type="text"
              value={form.streetAddress}
              onChange={(event) => setForm((current) => ({ ...current, streetAddress: event.target.value }))}
            />
            <p className="mt-2 text-xs text-slate-500">
              Street suggestions are scoped to the selected country{form.state ? `, ${form.state}` : ""}{form.city ? `, ${form.city}` : ""}.
            </p>
            {streetSuggestionsLoading && <p className="mt-2 text-xs text-slate-500">Searching matching addresses...</p>}
            {!streetSuggestionsLoading && streetSuggestions.length > 0 && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2">
                <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Suggested matches</p>
                <div className="space-y-1">
                  {streetSuggestions.map((suggestion) => (
                    <button
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      key={suggestion.id}
                      onClick={() => applyStreetSuggestion(suggestion.streetAddress, suggestion.postalCode)}
                      type="button"
                    >
                      <span className="block font-medium text-slate-900">{suggestion.streetAddress}</span>
                      <span className="block text-xs text-slate-500">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!streetSuggestionsLoading && !streetSuggestionsError && form.streetAddress.trim().length >= 3 && streetSuggestions.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">No matching addresses found for this location yet. Keep typing to refine the search.</p>
            )}
            {streetSuggestionsError && <p className="mt-2 text-xs text-amber-700">{streetSuggestionsError}</p>}
          </div>

          {locationError && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{locationError}</p>}

          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              checked={form.defaultAddress}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, defaultAddress: event.target.checked }))}
            />
            Make this my default delivery address
          </label>

          <div className="flex justify-end">
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving..." : activeAddress ? "Save address" : "Create address"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No saved addresses yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Add your first delivery location here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">{address.label}</p>
                    {address.defaultAddress && (
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        Default
                      </span>
                    )}
                    {!address.complete && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                        Complete details
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                    {formatAddress(address).map((line) => (
                      <p key={`${address.id}-${line}`}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!address.defaultAddress && (
                    <button
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      disabled={saving}
                      type="button"
                      onClick={() => void makeDefault(address)}
                    >
                      Make default
                    </button>
                  )}
                  <button
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    type="button"
                    onClick={() => openEditForm(address)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    disabled={saving}
                    type="button"
                    onClick={() => void removeAddress(address)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AddressBookSection;
