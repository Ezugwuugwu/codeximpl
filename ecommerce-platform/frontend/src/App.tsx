import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "./context/CartContext";
import { productApi, userApi } from "./services/api";
import { supportService } from "./services/supportService";
import StorePage from "./pages/StorePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OtpVerificationPage from "./pages/OtpVerificationPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import ContactPage from "./pages/ContactPage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import SiteFooter from "./components/layout/SiteFooter";
import type { LiveAgentSession } from "./types/support";
import type { UserProfile } from "./types";
import { clearAuthToken, getAuthSession } from "./utils/auth";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [liveAgentUnread, setLiveAgentUnread] = useState(0);
  const [supportNotificationCount, setSupportNotificationCount] = useState(0);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const token = authSession.token || undefined;
  const isAuthenticated = authSession.isAuthenticated;
  const userEmail = currentUserProfile?.email || authSession.email || null;
  const userName = currentUserProfile?.fullName || authSession.displayName || null;
  const isAdmin = (currentUserProfile?.role ?? authSession.role) === "ADMIN";
  const normalizedCategories = useMemo(
    () => categories.map((category) => category.trim()).filter((category) => category.length > 0),
    [categories]
  );
  const storeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const storeSearchQuery = storeParams.get("q") ?? "";
  const selectedCategory = (storeParams.get("category") ?? "").trim().toLowerCase();
  const accountName = useMemo(() => {
    const raw = userName ?? (userEmail ? userEmail.split("@")[0].replace(/[._-]+/g, " ") : "Guest User");
    return raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }, [userName, userEmail]);
  const accountEmail = userEmail ?? "No account signed in";

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

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const profile = (event as CustomEvent<UserProfile>).detail;
      if (profile) {
        setCurrentUserProfile(profile);
      }
    };

    window.addEventListener("profile-updated", onProfileUpdated as EventListener);
    return () => window.removeEventListener("profile-updated", onProfileUpdated as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setCurrentUserProfile(null);
      return () => {
        cancelled = true;
      };
    }

    const loadCurrentProfile = async () => {
      try {
        const profile = await userApi.getMe(token);
        if (!cancelled) {
          setCurrentUserProfile(profile);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserProfile(null);
        }
      }
    };

    loadCurrentProfile().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const buildStoreLink = (category?: string) => {
    const params = new URLSearchParams(location.search);
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };

  const onStoreSearchChange = (value: string) => {
    const params = new URLSearchParams(location.search);
    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    const query = params.toString();
    navigate(
      {
        pathname: "/",
        search: query ? `?${query}` : "",
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem("auth_token") || undefined;
        const { content: products } = await productApi.list(token);
        const uniqueCategories = Array.from(
          new Set(
            products.map((product) => product.category?.trim() || "Uncategorized")
          )
        ).sort((a, b) => a.localeCompare(b));
        setCategories(uniqueCategories);
      } catch {
        setCategories([]);
      }
    };

    loadCategories().catch(() => undefined);

    const onAuthChange = () => {
      loadCategories().catch(() => undefined);
    };

    const onProductsChange = () => {
      loadCategories().catch(() => undefined);
    };

    window.addEventListener("auth-changed", onAuthChange);
    window.addEventListener("products-changed", onProductsChange);
    return () => {
      window.removeEventListener("auth-changed", onAuthChange);
      window.removeEventListener("products-changed", onProductsChange);
    };
  }, []);

  useEffect(() => {
    const update = async () => {
      let sessions: LiveAgentSession[] = [];
      try {
        sessions = await supportService.listLiveSessions();
      } catch {
        sessions = [];
      }

      if (isAdmin) {
        setLiveAgentUnread(supportService.getUnreadSessionCount(sessions));
      } else {
        setLiveAgentUnread(0);
      }

      setSupportNotificationCount(
        supportService.getSupportNotificationCount({
          sessions,
          isAdmin,
          userEmail,
        })
      );
    };

    const handleUpdate = () => void update();
    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith("okanga_")) {
        return;
      }
      void update();
    };

    void update();
    window.addEventListener("support:store-updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("okanga_support");
      channel.onmessage = handleUpdate;
    }
    const timer = window.setInterval(handleUpdate, 5000);
    return () => {
      window.removeEventListener("support:store-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
      window.clearInterval(timer);
    };
  }, [isAdmin, userEmail]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    setIsAccountPanelOpen(false);
  }, [location.pathname, location.search]);

  const closeAccountPanel = () => {
    setIsAccountPanelOpen(false);
  };

  const logout = () => {
    clearAuthToken();
    setCurrentUserProfile(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ecfeff] to-[#fef2f2] text-ink">
      <div className="mx-auto w-full max-w-[1520px] px-4 pb-10 pt-8 sm:px-6 xl:px-8">
        <header className="mb-8 overflow-hidden rounded-3xl border border-[#122033] shadow-2xl">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-[#111827] via-[#13233a] to-[#17283f] p-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center justify-between md:contents">
              <Link className="shrink-0 px-1 text-3xl font-bold tracking-tight text-white" to="/">
                Okanga
              </Link>

              <nav className="flex items-center gap-2 text-sm font-medium md:order-last">
                <Link to="/" className="rounded-full bg-ink px-4 py-2 text-white transition hover:opacity-85">Store</Link>

                <button
                  aria-expanded={isAccountPanelOpen}
                  aria-label="Open account panel"
                  className="relative inline-flex items-center gap-1 rounded-full border border-slate-400/70 bg-white/95 px-2.5 py-1.5 text-slate-800 transition hover:bg-white"
                  onClick={() => setIsAccountPanelOpen((prev) => !prev)}
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-3.7 4.5-5.5 8-5.5s6.5 1.8 8 5.5" />
                  </svg>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  {supportNotificationCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {supportNotificationCount > 99 ? "99+" : supportNotificationCount}
                    </span>
                  )}
                </button>

                <Link
                  to="/cart"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-400/70 bg-white/95 text-slate-900 transition hover:bg-white"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 24 24">
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M2 3h2.7c.4 0 .8.3.9.7l2.2 11c.1.4.5.7.9.7h9.8c.4 0 .8-.3.9-.7l1.7-7.4a1 1 0 0 0-1-.9H7.2" />
                  </svg>
                  <span className="sr-only">Cart</span>
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f5c955] px-1 text-[10px] font-bold text-slate-900">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            <div className="w-full flex-1">
              <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                <input
                  className="w-full border-0 px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-0"
                  placeholder="Search products, keywords, and categories..."
                  type="search"
                  value={storeSearchQuery}
                  onChange={(event) => onStoreSearchChange(event.target.value)}
                />
                <button
                  aria-label="Search store"
                  className="flex w-12 items-center justify-center bg-[#f5c955] text-[#111827] transition hover:bg-[#f1bc2f]"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          {normalizedCategories.length > 0 && (
            <nav className="category-ribbon-scroll flex w-full items-center gap-2 overflow-x-auto bg-[#1d2d44] px-3 py-2.5">
              <Link
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  selectedCategory
                    ? "border-white/40 bg-white/10 text-slate-100 hover:bg-white/20"
                    : "border-[#f5c955] bg-[#f5c955] text-[#102033]"
                }`}
                to={buildStoreLink()}
              >
                All Products
              </Link>
              {normalizedCategories.map((category) => {
                const isSelected = selectedCategory === category.toLowerCase();
                return (
                  <Link
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? "border-[#f5c955] bg-[#f5c955] text-[#102033]"
                        : "border-white/35 bg-white/10 text-slate-100 hover:bg-white/20"
                    }`}
                    key={category}
                    to={buildStoreLink(category)}
                  >
                    {category}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<OtpVerificationPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>

      {isAccountPanelOpen && (
        <button
          aria-label="Close account panel"
          className="fixed inset-0 z-40 bg-slate-900/45"
          onClick={closeAccountPanel}
          type="button"
        />
      )}
      <aside
        aria-hidden={!isAccountPanelOpen}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
          isAccountPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-[#1e2f47] to-[#253a59] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-200">Account</p>
              <p className="mt-2 text-2xl font-semibold">{accountName}</p>
              <p className="mt-1 text-sm text-slate-100/90">{accountEmail}</p>
            </div>
            <button
              aria-label="Close account panel"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              onClick={closeAccountPanel}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-2 p-4">
          {isAdmin && (
            <Link
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={closeAccountPanel}
              to="/admin"
            >
              <span>Admin Dashboard</span>
              {liveAgentUnread > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {liveAgentUnread > 9 ? "9+" : liveAgentUnread}
                </span>
              )}
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <Link
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={closeAccountPanel}
                to="/settings"
              >
                Settings
              </Link>
              <button
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={() => {
                  closeAccountPanel();
                  logout();
                }}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={closeAccountPanel}
                to="/login"
              >
                Login
              </Link>
              <Link
                className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={closeAccountPanel}
                to="/register"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </aside>
      <SiteFooter />
    </div>
  );
}

export default App;
