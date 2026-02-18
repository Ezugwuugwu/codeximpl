import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "./context/CartContext";
import { productApi } from "./services/api";
import type { Product } from "./types";
import SiteFooter from "./components/layout/SiteFooter";
import StorePage from "./pages/StorePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CartPage from "./pages/CartPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [categories, setCategories] = useState<string[]>([]);
  const isAuthenticated = Boolean(localStorage.getItem("auth_token"));
  const normalizedCategories = useMemo(
    () => categories.map((category) => category.trim()).filter((category) => category.length > 0),
    [categories]
  );
  const selectedCategory = useMemo(
    () => new URLSearchParams(location.search).get("category")?.trim().toLowerCase() || "",
    [location.search]
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem("auth_token") || undefined;
        const products: Product[] = await productApi.list(token);
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

  const logout = () => {
    localStorage.removeItem("auth_token");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ecfeff] to-[#fef2f2] text-ink">
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em]">
              <span className="text-fuchsia-600">You</span>{" "}
              <span className="text-cyan-600">dream</span>{" "}
              <span className="text-emerald-600">it,</span>{" "}
              <span className="text-amber-600">we</span>{" "}
              <span className="text-rose-600">bring</span>{" "}
              <span className="text-violet-600">it</span>
            </p>
            <h1 className="text-3xl font-black">
              <span className="bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 bg-clip-text text-transparent">Okanga</span>{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-lime-500 to-amber-500 bg-clip-text text-transparent">Mart</span>
            </h1>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/" className="rounded-full bg-ink px-4 py-2 text-white transition hover:opacity-85">Store</Link>
            <Link to="/admin" className="rounded-full border border-ink px-4 py-2 transition hover:bg-ink hover:text-white">Admin</Link>
            <Link to="/cart" className="rounded-full border border-slate-300 px-4 py-2 transition hover:bg-slate-100">
              Cart ({cartCount})
            </Link>
            {isAuthenticated ? (
              <button
                className="rounded-full bg-mint px-4 py-2 text-ink transition hover:brightness-95"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            ) : (
              <Link to="/login" className="rounded-full bg-mint px-4 py-2 text-ink transition hover:brightness-95">Login</Link>
            )}
          </nav>
        </header>

        {normalizedCategories.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-800/30 bg-gradient-to-r from-[#0b1b2e] via-[#14263b] to-[#1c3652] shadow-lg">
            <nav className="category-ribbon-scroll flex w-full items-center gap-2 overflow-x-auto px-3 py-3">
              {normalizedCategories.map((category) => (
                <button
                  className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition ${
                    category.toLowerCase() === selectedCategory
                      ? "border-white/40 bg-white/20 text-white"
                      : "border-white/20 text-slate-100 hover:bg-white/20"
                  }`}
                  key={category}
                  onClick={() => navigate(`/?category=${encodeURIComponent(category)}`)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </nav>
          </section>
        )}

        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  );
}

export default App;
