import { FormEvent, useState } from "react";
import { authApi } from "../services/api";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setToken("");
    try {
      const response = await authApi.login(email, password);
      let storageAvailable = true;
      try {
        localStorage.setItem("auth_token", response.token);
      } catch {
        storageAvailable = false;
        setError("Login succeeded but browser storage is blocked. Turn off private browsing and retry.");
      }
      setToken(response.token);
      if (storageAvailable) {
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/admin");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMessage =
          typeof err.response?.data === "object" && err.response?.data && "message" in err.response.data
            ? String((err.response.data as { message?: string }).message)
            : "";

        if (status === 401 || status === 403) {
          setError("Login failed: wrong email or password.");
          return;
        }

        if (status === 405) {
          setError("Login temporarily unavailable. Retry in 10-20 seconds.");
          return;
        }

        if (status) {
          setError(`Login failed: server returned ${status}. ${serverMessage}`.trim());
          return;
        }
      }

      setError("Login failed: backend is not reachable yet. Wait 2-3 minutes after startup, then retry.");
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <h2 className="text-2xl font-semibold">Sign In</h2>
      <p className="mt-1 text-sm text-slate-600">Authenticate via user-service JWT endpoint.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        <button className="w-full rounded-xl bg-ink px-4 py-2 text-white">Login</button>
      </form>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {token && (
        <p className="mt-4 break-all rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
          Token stored in localStorage: {token}
        </p>
      )}
    </section>
  );
}

export default LoginPage;
