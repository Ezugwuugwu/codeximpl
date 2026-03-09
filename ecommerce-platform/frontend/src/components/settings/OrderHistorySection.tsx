import { useEffect, useMemo, useState } from "react";
import { orderApi } from "../../services/api";
import type { CustomerOrder } from "../../types";

type OrderHistorySectionProps = {
  token: string;
};

function formatOrderDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently placed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatOrderStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusClasses(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "DELIVERED") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized === "CANCELLED") {
    return "bg-rose-50 text-rose-700";
  }
  if (normalized === "SHIPPED" || normalized === "PAID") {
    return "bg-sky-50 text-sky-700";
  }
  return "bg-amber-50 text-amber-700";
}

function OrderHistorySection({ token }: OrderHistorySectionProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await orderApi.listMine(token);
        if (!cancelled) {
          setOrders(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(message || "We could not load your order history right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const totalItems = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.reduce((itemCount, item) => itemCount + item.quantity, 0), 0),
    [orders]
  );

  return (
    <section
      id="orders-section"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#f5fbff] p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Orders</p>
          <h2
            className="mt-2 text-2xl font-semibold text-slate-900"
            id="settings-orders-heading"
            tabIndex={-1}
          >
            Order history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review your past purchases, statuses, and order totals in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total orders</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{orders.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Items purchased</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{totalItems}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : error ? (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Once you place your first order, its status and items will show here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">Order {order.id}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClasses(order.status)}`}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{formatOrderDate(order.createdAt)}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Items</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={`${order.id}-${item.productId}-${index}`}
                    className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Qty {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrderHistorySection;
