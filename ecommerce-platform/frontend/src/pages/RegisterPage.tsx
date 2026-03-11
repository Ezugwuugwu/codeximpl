import { FormEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../services/api";
import { activateGuestSession, buildAuthEntryPath, sanitizeRedirectTarget } from "../utils/auth";
import { formatAddressSuggestion, getEmailSuggestion, isValidEmail, isValidStreetAddress } from "../utils/contactValidation";
import { hasGuestCartItems } from "../utils/guestCart";

function RegisterPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTarget = sanitizeRedirectTarget(searchParams.get("redirect"));
  const authIntent = searchParams.get("intent");
  const authReason = searchParams.get("reason");
  const loginPath = buildAuthEntryPath(
    "login",
    redirectTarget ?? "/",
    authIntent === "checkout" ? "checkout" : authIntent === "cart" ? "cart" : undefined
  );

  const authPrompt =
    authReason === "auth-required"
      ? authIntent === "checkout"
        ? "Create an account or sign in first to continue to checkout."
        : "Create an account or sign in first to add items to your cart."
      : "";
  const guestCheckoutAvailable = hasGuestCartItems();
  const emailSuggestion = useMemo(() => getEmailSuggestion(email), [email]);
  const addressSuggestion = useMemo(() => formatAddressSuggestion(address), [address]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const form = formRef.current;
    if (form && !form.reportValidity()) {
      setError("Please correct the highlighted fields.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !address.trim()) {
      setError("First name, last name, and address are required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidStreetAddress(address)) {
      setError("Enter a complete delivery address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      const params = new URLSearchParams({
        email: email.trim().toLowerCase(),
      });
      if (redirectTarget) {
        params.set("redirect", redirectTarget);
      }
      if (authIntent === "checkout" || authIntent === "cart") {
        params.set("intent", authIntent);
      }
      navigate(`/verify-otp?${params.toString()}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 409) {
        setError("An account with this email already exists.");
      } else if (message) {
        setError(message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h2 className="mb-1 text-2xl font-semibold">Create an account</h2>
        <p className="mb-6 text-sm text-slate-500">Create your account and start shopping.</p>
        {authPrompt && <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">{authPrompt}</p>}
        {guestCheckoutAvailable && (
          <Link
            className="mb-4 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-amber-100"
            onClick={activateGuestSession}
            to="/guest-checkout"
          >
            <span>Continue as guest checkout</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}

        <form className="space-y-4" onSubmit={onSubmit} ref={formRef}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="firstName">
                First name
              </label>
              <input
                autoComplete="given-name"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                id="firstName"
                minLength={2}
                pattern="[A-Za-z][A-Za-z' -]{1,}"
                placeholder="Jane"
                required
                title="Enter a valid first name."
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="lastName">
                Last name
              </label>
              <input
                autoComplete="family-name"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                id="lastName"
                minLength={2}
                pattern="[A-Za-z][A-Za-z' -]{1,}"
                placeholder="Doe"
                required
                title="Enter a valid last name."
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address">
              Address
            </label>
              <input
                autoComplete="street-address"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                id="address"
                minLength={10}
                placeholder="123 Main St, City, State"
                required
                title="Enter a complete delivery address."
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              {addressSuggestion && (
                <button
                  className="mt-2 text-left text-xs font-medium text-sky-700 underline underline-offset-2"
                  onClick={() => setAddress(addressSuggestion)}
                  type="button"
                >
                  Use suggested address: {addressSuggestion}
                </button>
              )}
            </div>

            <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email address
            </label>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                id="email"
                placeholder="you@example.com"
                required
                title="Enter a valid email address."
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailSuggestion && (
                <button
                  className="mt-2 text-left text-xs font-medium text-sky-700 underline underline-offset-2"
                  onClick={() => setEmail(emailSuggestion)}
                  type="button"
                >
                  Use suggested email: {emailSuggestion}
                </button>
              )}
            </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
              id="password"
              minLength={8}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
              id="confirmPassword"
              placeholder="Repeat your password"
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-medium text-ink underline underline-offset-2" to={loginPath}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
