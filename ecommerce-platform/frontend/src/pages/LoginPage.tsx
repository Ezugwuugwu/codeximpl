import { FormEvent, useState } from "react";
import { authApi, cartApi } from "../services/api";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { buildAuthEntryPath, sanitizeRedirectTarget, setAuthToken } from "../utils/auth";
import { hasGuestCartItems, readGuestCart, removeGuestCartItem } from "../utils/guestCart";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeRedirectTarget(searchParams.get("redirect"));
  const authIntent = searchParams.get("intent");
  const authReason = searchParams.get("reason");
  const registerPath = buildAuthEntryPath(
    "register",
    redirectTarget ?? "/",
    authIntent === "checkout" ? "checkout" : authIntent === "cart" ? "cart" : undefined
  );

  const authPrompt =
    authReason === "auth-required"
      ? authIntent === "checkout"
        ? "Sign in or create an account to continue to checkout."
        : "Sign in or create an account to add items to your cart."
      : "";
  const guestCheckoutAvailable = hasGuestCartItems();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await authApi.login(email, password);
      setAuthToken(response.token);

      const shouldMergeGuestCart = guestCheckoutAvailable && (authIntent === "cart" || authIntent === "checkout");
      if (shouldMergeGuestCart) {
        const guestItems = readGuestCart();
        for (const item of guestItems) {
          try {
            await cartApi.addItem(response.token, {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            });
            removeGuestCartItem(item.productId);
          } catch {
            setError("Signed in, but we could not restore one or more guest checkout items.");
            break;
          }
        }
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/cart");
        return;
      }

      navigate(redirectTarget ?? (response.role === "ADMIN" ? "/admin" : "/"));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setError("Login failed: wrong email or password.");
          return;
        }
        if (status === 405) {
          setError("Login temporarily unavailable. Retry in 10-20 seconds.");
          return;
        }
        if (status) {
          setError(`Login failed: server returned ${status}.`);
          return;
        }
      }
      setError("Login failed: backend is not reachable yet. Wait a moment and retry.");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h2 className="mb-1 text-2xl font-semibold">Sign in</h2>
        <p className="mb-6 text-sm text-slate-500">Welcome back to Okanga Mart.</p>
        {authPrompt && <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">{authPrompt}</p>}
        {guestCheckoutAvailable && (
          <Link
            className="mb-4 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-amber-100"
            to="/guest-checkout"
          >
            <span>Continue as guest checkout</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
              id="email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
              id="password"
              placeholder="Your password"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90" type="submit">
            Sign in
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link className="font-medium text-ink underline underline-offset-2" to={registerPath}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
