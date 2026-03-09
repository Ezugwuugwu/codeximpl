import { FormEvent, useEffect, useMemo, useState } from "react";
import { userApi } from "../../services/api";
import type { NotificationPreferences } from "../../types";

type NotificationPreferencesSectionProps = {
  token: string;
};

const emptyPreferences: NotificationPreferences = {
  orderUpdatesEnabled: true,
  accountAlertsEnabled: true,
  marketingEmailsEnabled: false,
};

function NotificationPreferencesSection({ token }: NotificationPreferencesSectionProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(emptyPreferences);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await userApi.getNotificationPreferences(token);
        if (!cancelled) {
          setPreferences(result);
          setSavedPreferences(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(message || "We could not load your notification preferences.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasChanges = useMemo(() => {
    if (!savedPreferences) {
      return false;
    }

    return (
      savedPreferences.orderUpdatesEnabled !== preferences.orderUpdatesEnabled ||
      savedPreferences.accountAlertsEnabled !== preferences.accountAlertsEnabled ||
      savedPreferences.marketingEmailsEnabled !== preferences.marketingEmailsEnabled
    );
  }, [preferences, savedPreferences]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updated = await userApi.updateNotificationPreferences(token, preferences);
      setPreferences(updated);
      setSavedPreferences(updated);
      setSuccess("Your notification preferences have been updated.");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Notification preferences could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  };

  return (
    <section
      id="notifications-section"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#f5fbff] p-6 shadow-sm"
    >
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notifications</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Notification preferences</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Control which operational and promotional emails reach your inbox.
        </p>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : (
        <form className="space-y-4 pt-6" onSubmit={onSubmit}>
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <input
              checked={preferences.orderUpdatesEnabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              id="notifications-order-updates"
              type="checkbox"
              onChange={(event) => updatePreference("orderUpdatesEnabled", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Payment confirmations</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Email me when a payment succeeds so I can review the confirmed order details.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <input
              checked={preferences.accountAlertsEnabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              type="checkbox"
              onChange={(event) => updatePreference("accountAlertsEnabled", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Account alerts</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Keep security and account-access emails enabled for important changes.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <input
              checked={preferences.marketingEmailsEnabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              type="checkbox"
              onChange={(event) => updatePreference("marketingEmailsEnabled", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Offers and announcements</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Receive product drops, campaigns, and curated promotions from Okanga Mart.
              </span>
            </span>
          </label>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !hasChanges}
              type="submit"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default NotificationPreferencesSection;
