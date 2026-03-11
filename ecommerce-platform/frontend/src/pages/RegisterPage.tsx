import { FormEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SearchableSelect from "../components/forms/SearchableSelect";
import { useLocationDirectory, useStreetAddressSuggestions } from "../hooks/useLocationDirectory";
import { authApi } from "../services/api";
import { activateGuestSession, buildAuthEntryPath, sanitizeRedirectTarget } from "../utils/auth";
import { getEmailSuggestion, isValidEmail, isValidStreetAddress } from "../utils/contactValidation";
import { hasGuestCartItems } from "../utils/guestCart";

function RegisterPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
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
  const composedAddress = useMemo(
    () => [streetAddress.trim(), city.trim(), state.trim(), country.trim()].filter(Boolean).join(", "),
    [city, country, state, streetAddress]
  );
  const { countries, states, cities, countriesLoading, statesLoading, citiesLoading } = useLocationDirectory(country, state);
  const {
    suggestions: streetSuggestions,
  } = useStreetAddressSuggestions(streetAddress, {
    country,
    state,
    city,
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const form = formRef.current;
    if (form && !form.reportValidity()) {
      setError("Please correct the highlighted fields.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !streetAddress.trim() || !country.trim() || !state.trim() || !city.trim()) {
      setError("First name, last name, country, state, city, and street address are required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidStreetAddress(streetAddress)) {
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
        address: composedAddress,
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="register-country">
                Country
              </label>
              <SearchableSelect
                disabled={countriesLoading || countries.length === 0}
                id="register-country"
                loading={countriesLoading}
                noOptionsLabel="No countries found."
                onChange={(value) => {
                  setCountry(value);
                  setState("");
                  setCity("");
                }}
                options={countries.map((countryOption) => countryOption.name)}
                placeholder="Select country"
                searchPlaceholder="Search country"
                value={country}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="register-state">
                State / Region
              </label>
              <SearchableSelect
                disabled={!country || statesLoading || states.length === 0}
                id="register-state"
                loading={statesLoading}
                noOptionsLabel={!country ? "Select country first." : "No states found."}
                onChange={(value) => {
                  setState(value);
                  setCity("");
                }}
                options={states.map((stateOption) => stateOption.name)}
                placeholder={!country ? "Select country first" : "Select state"}
                searchPlaceholder="Search state"
                value={state}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="register-city">
                City
              </label>
              <SearchableSelect
                disabled={!country || !state || citiesLoading || cities.length === 0}
                id="register-city"
                loading={citiesLoading}
                noOptionsLabel={!state ? "Select state first." : "No cities found."}
                onChange={setCity}
                options={cities}
                placeholder={!state ? "Select state first" : "Select city"}
                searchPlaceholder="Search city"
                value={city}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="register-street-address">
                Street address
              </label>
              <input
                autoComplete="street-address"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                id="register-street-address"
                minLength={10}
                placeholder={city ? `Start typing an address in ${city}` : "Start typing your street address"}
                required
                title="Enter a complete delivery address."
                type="text"
                value={streetAddress}
                onChange={(event) => setStreetAddress(event.target.value)}
              />
              {streetSuggestions.length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Suggested matches</p>
                  <div className="space-y-1">
                    {streetSuggestions.map((suggestion) => (
                      <button
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-white"
                        key={suggestion.id}
                        onClick={() => setStreetAddress(suggestion.streetAddress)}
                        type="button"
                      >
                        <span className="block font-medium text-slate-900">{suggestion.streetAddress}</span>
                        <span className="block text-xs text-slate-500">{suggestion.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
              {composedAddress && <p className="mt-2 text-xs text-slate-500">Address on the account: {composedAddress}</p>}
            </div>
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
