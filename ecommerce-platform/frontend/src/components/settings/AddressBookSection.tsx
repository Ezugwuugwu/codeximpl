import { FormEvent, useEffect, useMemo, useState } from "react";
import { userApi } from "../../services/api";
import type { UserAddress, UserAddressUpsertRequest } from "../../types";

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
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [form, setForm] = useState<UserAddressUpsertRequest>(emptyForm);

  const hasExistingAddresses = addresses.length > 0;
  const activeAddress = useMemo(
    () => addresses.find((address) => address.id === editingAddressId) ?? null,
    [addresses, editingAddressId]
  );

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
  };

  const closeForm = () => {
    setEditingAddressId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.label.trim() || !form.streetAddress.trim() || !form.city.trim() || !form.state.trim() || !form.country.trim()) {
      setError("Label, street address, city, state, and country are required.");
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
      await userApi.updateAddress(token, address.id, {
        label: address.label,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        defaultAddress: true,
      });
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Addresses</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Address book</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Delivery addresses now live in their own address-book module, separate from identity and password changes.
            The default address still syncs back to your legacy profile record for compatibility.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          type="button"
          onClick={openCreateForm}
        >
          Add address
        </button>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      {isFormOpen && (
        <form className="mt-5 space-y-4 rounded-3xl border border-[#f5c955] bg-[#fffdf4] p-5" onSubmit={onSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeAddress ? `Edit ${activeAddress.label}` : "Add a new address"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Keep delivery locations separate from profile identity so checkout and account settings stay maintainable.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white"
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-label"
                maxLength={80}
                placeholder="Home, Office, Parents..."
                type="text"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-country">
                Country
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-country"
                maxLength={120}
                type="text"
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-street">
              Street address
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
              id="address-street"
              maxLength={255}
              value={form.streetAddress}
              onChange={(event) => setForm((current) => ({ ...current, streetAddress: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-city">
                City
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-city"
                maxLength={120}
                type="text"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-state">
                State
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-state"
                maxLength={120}
                type="text"
                value={form.state}
                onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address-postal-code">
                Postal code
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="address-postal-code"
                maxLength={40}
                type="text"
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
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
            Add your first delivery location here so later checkout and order modules can reuse it cleanly.
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
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                      disabled={saving}
                      type="button"
                      onClick={() => void makeDefault(address)}
                    >
                      Make default
                    </button>
                  )}
                  <button
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                    type="button"
                    onClick={() => openEditForm(address)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
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
    </div>
  );
}

export default AddressBookSection;
