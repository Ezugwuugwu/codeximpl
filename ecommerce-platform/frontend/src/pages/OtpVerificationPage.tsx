import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../services/api";
import { buildAuthEntryPath, sanitizeRedirectTarget } from "../utils/auth";

const RESEND_COOLDOWN_SECONDS = 30;

function OtpVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectTarget = sanitizeRedirectTarget(searchParams.get("redirect"));
  const authIntent = searchParams.get("intent");
  const loginPath = buildAuthEntryPath(
    "login",
    redirectTarget ?? "/",
    authIntent === "checkout" ? "checkout" : authIntent === "cart" ? "cart" : undefined
  );
  const registerPath = buildAuthEntryPath(
    "register",
    redirectTarget ?? "/",
    authIntent === "checkout" ? "checkout" : authIntent === "cart" ? "cart" : undefined
  );

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.verifyOtp(email, otp);
      setSuccess("Email verified! You can now log in.");
      setTimeout(() => navigate(loginPath), 1500);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Invalid or expired code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");
    try {
      await authApi.resendOtp(email);
      setSuccess("A new code has been sent to your email.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp("");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Could not resend code. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h2 className="mb-1 text-2xl font-semibold">Check your email</h2>
        <p className="mb-6 text-sm text-slate-500">
          We sent a 6-digit verification code to{" "}
          <span className="font-medium text-slate-700">{email}</span>.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="otp">
              Verification code
            </label>
            <input
              autoComplete="one-time-code"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-lg font-mono tracking-[0.4em] focus:border-ink focus:outline-none"
              id="otp"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          )}

          <button
            className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={submitting || otp.length !== 6}
            type="submit"
          >
            {submitting ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            className="text-sm text-slate-500 underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            disabled={resendCooldown > 0}
            type="button"
            onClick={onResend}
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Wrong email?{" "}
          <Link className="font-medium text-ink underline underline-offset-2" to={registerPath}>
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
}

export default OtpVerificationPage;
