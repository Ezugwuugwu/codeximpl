import { ChangeEvent, FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import LiveAgentInboxPanel from "../components/admin/LiveAgentInboxPanel";
import { orderApi, productApi } from "../services/api";
import type { AnalyticsOverview, CustomerOrder, Product, ProductCreateRequest } from "../types";

type CategoryGroup = {
  name: string;
  count: number;
  totalStock: number;
  averagePrice: number;
  products: Product[];
};

type AnalyticsRange = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_365_DAYS" | "ALL_TIME";

type AnalyticsRangeOption = {
  id: AnalyticsRange;
  label: string;
};

const fallbackImage = "https://picsum.photos/seed/product-fallback/1000/700";
const SUCCESSFUL_PAID_STATUSES = new Set(["PAID", "FULFILLING", "SHIPPED", "DELIVERED"]);
const ANALYTICS_RANGE_OPTIONS: AnalyticsRangeOption[] = [
  { id: "TODAY", label: "Today" },
  { id: "LAST_7_DAYS", label: "7 Days" },
  { id: "LAST_30_DAYS", label: "1 Month" },
  { id: "LAST_365_DAYS", label: "1 Year" },
  { id: "ALL_TIME", label: "Overall" },
];

const productNewestFirst = (a: Product, b: Product) => {
  const aUpdatedAt = a.updatedAt ? Date.parse(a.updatedAt) : Number.NaN;
  const bUpdatedAt = b.updatedAt ? Date.parse(b.updatedAt) : Number.NaN;

  const aTime = Number.isNaN(aUpdatedAt) ? 0 : aUpdatedAt;
  const bTime = Number.isNaN(bUpdatedAt) ? 0 : bUpdatedAt;

  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return b.id - a.id;
};

const emptyForm: ProductCreateRequest = {
  name: "",
  description: "",
  category: "",
  price: 0,
  stock: 0,
  imageUrls: [],
};

function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedRange, setSelectedRange] = useState<AnalyticsRange>("ALL_TIME");
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  });
  const [error, setError] = useState("");

  const [form, setForm] = useState<ProductCreateRequest>(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductCreateRequest>(emptyForm);
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editPhotoPreviews, setEditPhotoPreviews] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [productActionError, setProductActionError] = useState("");
  const [productActionSuccess, setProductActionSuccess] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);

  const token = useMemo(() => localStorage.getItem("auth_token") || "", []);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "ADMIN") {
        navigate("/", { replace: true });
        return;
      }
    } catch {
      navigate("/login", { replace: true });
      return;
    }

    setData({
      timestamp: new Date().toISOString(),
      productCount: 0,
      openOrders: 0,
      estimatedRevenueToday: 0,
      conversionRate: 0,
      alerts: "Loading...",
    });

    // Load with a large page size so all products/orders are available for stats.
    Promise.allSettled([productApi.list(token, 0, 500), orderApi.listAll(token, 0, 500)]).then(
      ([productsResult, ordersResult]) => {
        const productList = productsResult.status === "fulfilled" ? productsResult.value.content : [];
        const orderList = ordersResult.status === "fulfilled" ? ordersResult.value.content : [];
        setProducts([...productList].sort(productNewestFirst));
        setOrders(orderList);
      }
    );
  }, [token]);

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; products: Product[]; totalStock: number; totalPrice: number }>();

    products.forEach((product) => {
      const categoryName = product.category?.trim() || "Uncategorized";
      const key = categoryName.toLowerCase();
      const current = map.get(key);

      if (current) {
        current.products.push(product);
        current.totalStock += product.stock;
        current.totalPrice += Number(product.price);
      } else {
        map.set(key, {
          name: categoryName,
          products: [product],
          totalStock: product.stock,
          totalPrice: Number(product.price),
        });
      }
    });

    return Array.from(map.values())
      .map((value): CategoryGroup => ({
        name: value.name,
        count: value.products.length,
        totalStock: value.totalStock,
        averagePrice: value.products.length ? value.totalPrice / value.products.length : 0,
        products: [...value.products].sort(productNewestFirst),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const existingCategoryNames = useMemo(
    () => categories.map((category) => category.name),
    [categories]
  );

  const filteredOrders = useMemo(() => {
    const inRange = (start: Date, end?: Date) => {
      const startTimestamp = start.getTime();
      const endTimestamp = end?.getTime();

      return orders.filter((order) => {
        const createdAtTimestamp = Date.parse(order.createdAt);
        if (!Number.isFinite(createdAtTimestamp) || createdAtTimestamp < startTimestamp) {
          return false;
        }
        if (typeof endTimestamp === "number" && createdAtTimestamp >= endTimestamp) {
          return false;
        }
        return true;
      });
    };

    if (selectedRange === "ALL_TIME") {
      return orders;
    }

    const anchorDate = new Date(`${calendarDate}T00:00:00`);
    if (Number.isNaN(anchorDate.getTime())) {
      return [];
    }

    const end = new Date(anchorDate);
    end.setDate(end.getDate() + 1);
    const start = new Date(anchorDate);

    if (selectedRange === "LAST_7_DAYS") {
      start.setDate(start.getDate() - 6);
    } else if (selectedRange === "LAST_30_DAYS") {
      start.setDate(start.getDate() - 29);
    } else if (selectedRange === "LAST_365_DAYS") {
      start.setDate(start.getDate() - 364);
    }

    return inRange(start, end);
  }, [calendarDate, orders, selectedRange]);

  const paidOrders = useMemo(
    () => filteredOrders.filter((order) => SUCCESSFUL_PAID_STATUSES.has(order.status)),
    [filteredOrders]
  );

  const paidOrdersCount = paidOrders.length;

  const totalRevenue = useMemo(
    () => paidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    [paidOrders]
  );

  const conversionRate = useMemo(
    () => (filteredOrders.length === 0 ? 0 : paidOrdersCount / filteredOrders.length),
    [filteredOrders.length, paidOrdersCount]
  );

  const OPEN_ORDER_STATUSES = new Set(["CREATED", "PAYMENT_PENDING", "PAID", "FULFILLING", "SHIPPED"]);
  const alerts = useMemo(() => {
    const openCount = orders.filter((o) => OPEN_ORDER_STATUSES.has(o.status)).length;
    return openCount > 0 ? `Orders pending fulfillment: ${openCount}` : "No critical incidents";
  }, [orders]);

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.readAsDataURL(file);
    });

  const onFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setPhotoPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const onEditFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setEditSelectedFiles(files);
    if (files.length > 0) {
      setEditPhotoPreviews(files.map((file) => URL.createObjectURL(file)));
    }
  };

  const beginEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      stock: product.stock,
      imageUrls: product.imageUrls ?? [],
    });
    setEditSelectedFiles([]);
    setEditPhotoPreviews(product.imageUrls ?? []);
    setProductActionError("");
    setProductActionSuccess("");
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditForm(emptyForm);
    setEditSelectedFiles([]);
    setEditPhotoPreviews([]);
  };

  const onSaveEdit = async (productId: number) => {
    setProductActionError("");
    setProductActionSuccess("");

    if (!token) {
      setProductActionError("Session expired. Login again.");
      return;
    }

    if (!editForm.name || !editForm.description || !editForm.category || editForm.price <= 0 || editForm.stock < 0) {
      setProductActionError("Complete all product fields with valid values.");
      return;
    }

    if (editSelectedFiles.length > 8) {
      setProductActionError("Maximum 8 photos per product.");
      return;
    }

    setEditing(true);
    try {
      const imageUrls = editSelectedFiles.length > 0
        ? await Promise.all(editSelectedFiles.map((file) => toDataUrl(file)))
        : editForm.imageUrls;

      const updated = await productApi.update(token, productId, {
        ...editForm,
        imageUrls,
      });

      setProducts((prev) =>
        prev
          .map((product) => (product.id === productId ? updated : product))
          .sort(productNewestFirst)
      );
      window.dispatchEvent(new Event("products-changed"));
      setProductActionSuccess(`Product updated: ${updated.name}`);
      cancelEdit();
    } catch {
      setProductActionError("Could not update product. Verify your admin token is valid.");
    } finally {
      setEditing(false);
    }
  };

  const onDeleteProduct = async (product: Product) => {
    setProductActionError("");
    setProductActionSuccess("");

    if (!token) {
      setProductActionError("Session expired. Login again.");
      return;
    }

    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingProductId(product.id);
    try {
      await productApi.remove(token, product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      window.dispatchEvent(new Event("products-changed"));
      if (editingProductId === product.id) {
        cancelEdit();
      }
      setProductActionSuccess(`Product deleted: ${product.name}`);
    } catch {
      setProductActionError("Could not delete product. Verify your admin token is valid.");
    } finally {
      setDeletingProductId(null);
    }
  };

  const onAddProduct = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!token) {
      setFormError("Session expired. Login again.");
      return;
    }

    if (!form.name || !form.description || !form.category || form.price <= 0 || form.stock < 0) {
      setFormError("Complete all product fields with valid values.");
      return;
    }

    if (selectedFiles.length === 0) {
      setFormError("Upload at least one product photo.");
      return;
    }

    if (selectedFiles.length > 8) {
      setFormError("Maximum 8 photos per product.");
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = await Promise.all(selectedFiles.map((file) => toDataUrl(file)));
      const payload: ProductCreateRequest = {
        ...form,
        imageUrls,
      };

      const created = await productApi.create(token, payload);
      setProducts((prev) => [created, ...prev].sort(productNewestFirst));
      window.dispatchEvent(new Event("products-changed"));
      setForm(emptyForm);
      setSelectedFiles([]);
      setPhotoPreviews([]);
      setFormSuccess(`Product added: ${created.name}`);
    } catch {
      setFormError("Could not create product. Verify your admin token is valid.");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshOrders = async () => {
    if (!token) return;
    setRefreshingOrders(true);
    try {
      const result = await orderApi.listAll(token, 0, 500);
      setOrders(result.content);
    } catch {
      // silently ignore refresh errors
    } finally {
      setRefreshingOrders(false);
    }
  };

  if (error) {
    return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-600">Loading admin workspace...</p>;
  }

  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Admin Analytics Dashboard</h2>
            <p className="mt-1 text-sm text-white/80">Last refresh: {new Date(data.timestamp).toLocaleString()}</p>
          </div>
          <button
            className="rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            onClick={() => setIsAnalyticsExpanded((current) => !current)}
            type="button"
          >
            {isAnalyticsExpanded ? "Hide Analytics" : "View Analytics"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isAnalyticsExpanded && (
          <a className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="#orders">
            Orders Placed
          </a>
        )}
        <a className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="#products">
          All Products
        </a>
        <a className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="#add-product">
          Add New Product
        </a>
        <a className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="#categories">
          Categories
        </a>
        <a className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="#live-agent-inbox">
          Live Agent Inbox
        </a>
      </div>

      {!isAnalyticsExpanded && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Analytics view is collapsed.</p>
              <p className="text-xs text-slate-500">Click "View Analytics" to expand all analytics cards, filters, and orders insights.</p>
            </div>
            <button
              className="rounded-full border border-amber-400 bg-amber-300 px-4 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
              onClick={() => setIsAnalyticsExpanded(true)}
              type="button"
            >
              Expand Analytics
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Products:</span> {products.length}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Orders:</span> {filteredOrders.length}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Conversion:</span> {(conversionRate * 100).toFixed(2)}%
            </p>
          </div>
        </section>
      )}

      {isAnalyticsExpanded && (
        <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={String(products.length)} />
        <StatCard label="Orders Placed" value={String(filteredOrders.length)} />
        <StatCard label="Total Revenue" value={`₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <StatCard label="Conversion" value={`${(conversionRate * 100).toFixed(2)}%`} />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Analytics Range</p>
        <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="analytics-calendar-date">
            Calendar Date
          </label>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            id="analytics-calendar-date"
            type="date"
            value={calendarDate}
            onChange={(event) => setCalendarDate(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_RANGE_OPTIONS.map((option) => (
              <button
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  option.id === selectedRange
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                key={option.id}
                onClick={() => setSelectedRange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section id="orders" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Orders Placed</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} total &bull;{" "}
              {paidOrdersCount} paid &bull; Revenue ₦{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={refreshingOrders}
            onClick={() => void refreshOrders()}
            type="button"
          >
            {refreshingOrders ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {filteredOrders.length === 0 ? (
          <p className="text-sm text-slate-600">No orders for the selected range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Order ID</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Items</th>
                  <th className="pb-2 pr-4 font-medium">Total</th>
                  <th className="pb-2 pr-4 font-medium">Placed At</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-600">{order.id.slice(0, 8)}&hellip;</td>
                      <td className="py-2 pr-4">{order.userId}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.status === "PAID" || order.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-700"
                            : order.status === "PAYMENT_PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : order.status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : order.status === "SHIPPED"
                                  ? "bg-purple-100 text-purple-700"
                                  : order.status === "FULFILLING"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-700"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                      <td className="py-2 pr-4 font-medium">₦{Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-4 text-slate-500">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="py-2">
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                          type="button"
                        >
                          {expandedOrderId === order.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-4 pb-4 pt-2">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Order Items</p>
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-xs text-slate-500">
                                <th className="pb-1 pr-6 text-left font-medium">Product</th>
                                <th className="pb-1 pr-6 text-right font-medium">Qty</th>
                                <th className="pb-1 pr-6 text-right font-medium">Unit Price</th>
                                <th className="pb-1 text-right font-medium">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item) => (
                                <tr key={item.id ?? item.productId} className="border-t border-slate-200">
                                  <td className="py-1.5 pr-6">{item.productName}</td>
                                  <td className="py-1.5 pr-6 text-right text-slate-600">{item.quantity}</td>
                                  <td className="py-1.5 pr-6 text-right text-slate-600">₦{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1.5 text-right font-medium">₦{(Number(item.unitPrice) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-300">
                                <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-slate-700">Order Total</td>
                                <td className="pt-2 text-right text-sm font-semibold">₦{Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            </tfoot>
                          </table>
                          <p className="mt-2 font-mono text-xs text-slate-400">ID: {order.id}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}

      <LiveAgentInboxPanel />

      <section id="products" className="space-y-4">
        <h3 className="text-xl font-semibold">All Products</h3>
        {productActionError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{productActionError}</p>}
        {productActionSuccess && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{productActionSuccess}</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <img
                alt={product.name}
                className="h-44 w-full bg-slate-100 object-contain"
                src={product.imageUrls?.[0] || fallbackImage}
              />
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h4 className="text-lg font-semibold">{product.name}</h4>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">{product.category}</span>
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-slate-600">{product.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-slate-500">Price:</span> ${Number(product.price).toFixed(2)}</p>
                  <p><span className="text-slate-500">Stock:</span> {product.stock}</p>
                  <p><span className="text-slate-500">Item ID:</span> {product.id}</p>
                  <p><span className="text-slate-500">Photos:</span> {product.imageUrls?.length || 0}</p>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Updated: {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "N/A"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 disabled:opacity-60"
                    disabled={editing || deletingProductId === product.id}
                    onClick={() => beginEdit(product)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-60"
                    disabled={editing || deletingProductId === product.id}
                    onClick={() => onDeleteProduct(product)}
                    type="button"
                  >
                    {deletingProductId === product.id ? "Deleting..." : "Delete"}
                  </button>
                </div>

                {editingProductId === product.id && (
                  <form
                    className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void onSaveEdit(product.id);
                    }}
                  >
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Product name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      list="category-options"
                      placeholder="Category"
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                    <textarea
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Description"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        min="0.01"
                        placeholder="Price"
                        step="0.01"
                        type="number"
                        value={editForm.price || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                      />
                      <input
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        min="0"
                        placeholder="Stock"
                        step="1"
                        type="number"
                        value={editForm.stock || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="rounded-lg border border-slate-300 bg-white p-2">
                      <p className="mb-2 text-xs font-medium text-slate-600">Replace Photos (optional)</p>
                      <input accept="image/*" multiple onChange={onEditFileSelection} type="file" />
                      {editPhotoPreviews.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {editPhotoPreviews.map((preview) => (
                            <img alt="edit preview" className="h-14 w-full rounded bg-slate-100 object-contain" key={preview} src={preview} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg bg-ink px-3 py-1 text-sm text-white disabled:opacity-60"
                        disabled={editing}
                        type="submit"
                      >
                        {editing ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                        onClick={cancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <datalist id="category-options">
        {existingCategoryNames.map((categoryName) => (
          <option key={categoryName} value={categoryName} />
        ))}
      </datalist>

      <section id="add-product" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <h3 className="text-xl font-semibold">Add New Product</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onAddProduct}>
          <input
            className="rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2"
            list="category-options"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          />
          <input
            className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Price"
            type="number"
            min="0.01"
            step="0.01"
            value={form.price || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Stock"
            type="number"
            min="0"
            step="1"
            value={form.stock || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
          />
          <div className="md:col-span-2 rounded-xl border border-slate-300 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Upload Product Photos (multiple)</p>
            <input accept="image/*" multiple onChange={onFileSelection} type="file" />
            {photoPreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
                {photoPreviews.map((preview) => (
                  <img alt="preview" className="h-16 w-full rounded-lg bg-slate-100 object-contain" key={preview} src={preview} />
                ))}
              </div>
            )}
          </div>
          <button className="md:col-span-2 rounded-xl bg-ink px-4 py-2 text-white disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Create Product"}
          </button>
        </form>
        {formError && <p className="text-sm text-ember">{formError}</p>}
        {formSuccess && <p className="text-sm text-emerald-700">{formSuccess}</p>}
      </section>

      <section id="categories" className="space-y-4">
        <h3 className="text-xl font-semibold">Categories</h3>
        <div className="space-y-4">
          {categories.map((category) => (
            <article key={category.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{category.name}</p>
                <p className="text-sm text-slate-600">
                  {category.count} products • Stock Units: {category.totalStock} • Avg Price: ${category.averagePrice.toFixed(2)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {category.products.map((product) => (
                  <div key={`${category.name}-${product.id}`} className="overflow-hidden rounded-xl border border-slate-200">
                    <img
                      alt={product.name}
                      className="h-28 w-full bg-slate-100 object-contain"
                      src={product.imageUrls?.[0] || fallbackImage}
                    />
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">${Number(product.price).toFixed(2)} • Stock {product.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {isAnalyticsExpanded && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Alerts</p>
          <p className="mt-2 text-sm text-slate-700">{alerts}</p>
        </div>
      )}
    </section>
  );
}

export default AdminDashboardPage;
