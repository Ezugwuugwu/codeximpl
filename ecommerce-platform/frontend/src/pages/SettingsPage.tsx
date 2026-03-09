import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AddressBookSection from "../components/settings/AddressBookSection";
import { userApi } from "../services/api";
import type { UserProfile } from "../types";
import { clearAuthToken, getAuthSession } from "../utils/auth";

function formatMemberSince(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently joined";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function SettingsPage() {
  const navigate = useNavigate();
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const syncAuthSession = () => setAuthSession(getAuthSession());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "auth_token") {
        syncAuthSession();
      }
    };

    window.addEventListener("auth-changed", syncAuthSession);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-changed", syncAuthSession);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const loadProfile = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await userApi.getMe(token);
      setProfile(response);
      setForm({
        firstName: response.firstName,
        lastName: response.lastName,
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "We could not load your account details right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!authSession.token) {
      setProfile(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadCurrentProfile = async () => {
      await loadProfile(authSession.token);
    };

    loadCurrentProfile().catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authSession.token, loadProfile]);

  const hasChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    return form.firstName.trim() !== profile.firstName || form.lastName.trim() !== profile.lastName;
  }, [form, profile]);

  const canSubmitPasswordChange = useMemo(
    () =>
      passwordForm.currentPassword.trim().length > 0 &&
      passwordForm.newPassword.length >= 8 &&
      passwordForm.confirmNewPassword.length >= 8,
    [passwordForm]
  );

  if (!authSession.isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await userApi.updateMe(authSession.token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      setProfile(updated);
      setForm({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setSuccess("Your profile has been updated.");
      window.dispatchEvent(new CustomEvent<UserProfile>("profile-updated", { detail: updated }));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Profile update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  const onPasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await userApi.changePassword(authSession.token, passwordForm);
      setPasswordSuccess(response.message);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPasswordError(message || "Password update failed. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl border border-[#f5c955] bg-[#fff8dd] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Account settings</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Manage your profile, addresses, and password from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              to="/"
            >
              Back to store
            </Link>
            <button
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-[#f5c955] bg-[#fff8dd] p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#f1deb1] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Profile info</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Personal details</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Update the name tied to your account and review your primary contact details.
            </p>
          </div>

          {profile && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email</p>
                <p className="mt-2 break-all text-sm font-medium text-slate-800">{profile.email}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Member since</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{formatMemberSince(profile.createdAt)}</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4 pt-6">
            <div className="h-12 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-12 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-12 animate-pulse rounded-2xl bg-white/70" />
          </div>
        ) : (
          <form className="space-y-4 pt-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-first-name">
                  First name
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                  id="settings-first-name"
                  maxLength={80}
                  type="text"
                  value={form.firstName}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, firstName: event.target.value }));
                    setSuccess("");
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-last-name">
                  Last name
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                  id="settings-last-name"
                  maxLength={80}
                  type="text"
                  value={form.lastName}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, lastName: event.target.value }));
                    setSuccess("");
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-email">
                Email address
              </label>
              <input
                className="w-full cursor-not-allowed rounded-2xl border border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-500"
                disabled
                id="settings-email"
                type="email"
                value={profile?.email ?? authSession.email}
              />
            </div>

            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

            <div className="flex justify-end border-t border-[#f1deb1] pt-4">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving || !hasChanges}
                type="submit"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>

      <AddressBookSection
        token={authSession.token}
        onAddressesChanged={async () => {
          await loadProfile(authSession.token);
        }}
      />

      <section className="rounded-3xl border border-[#f5c955] bg-[#fff8dd] p-6 shadow-sm">
        <div className="border-b border-[#f1deb1] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Security</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Change password</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Rotate your password here without mixing security actions into profile updates.
          </p>
        </div>

        <form className="space-y-4 pt-6" onSubmit={onPasswordSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-current-password">
              Current password
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
              id="settings-current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => {
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }));
                setPasswordError("");
                setPasswordSuccess("");
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-new-password">
                New password
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="settings-new-password"
                minLength={8}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => {
                  setPasswordForm((current) => ({ ...current, newPassword: event.target.value }));
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="settings-confirm-password">
                Confirm new password
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-ink focus:outline-none"
                id="settings-confirm-password"
                minLength={8}
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) => {
                  setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }));
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
              />
            </div>
          </div>

          {passwordError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</p>}
          {passwordSuccess && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordSuccess}</p>}

          <div className="flex justify-end border-t border-[#f1deb1] pt-4">
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={changingPassword || !canSubmitPasswordChange}
              type="submit"
            >
              {changingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SettingsPage;
