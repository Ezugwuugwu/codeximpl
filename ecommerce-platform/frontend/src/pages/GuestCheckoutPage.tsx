import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PaystackCheckoutButton from "../components/payments/PaystackCheckoutButton";
import { orderApi } from "../services/api";
import type { GuestOrderCustomer } from "../types";
import { getAuthSession } from "../utils/auth";
import {
  clearGuestCart,
  getGuestCartSubtotal,
  readGuestCart,
  removeGuestCartItem,
  updateGuestCartItemQuantity,
  type GuestCartItem,
} from "../utils/guestCart";

const initialCustomer: GuestOrderCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Nigeria",
};

function GuestCheckoutPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GuestCartItem[]>(() => readGuestCart());
  const [customer, setCustomer] = useState<GuestOrderCustomer>(initialCustomer);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [placing, setPlacing] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (getAuthSession().isAuthenticated) {
      navigate("/cart", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const syncGuestCart = () => setItems(readGuestCart());
    window.addEventListener("guest-cart-changed", syncGuestCart);
    return () => window.removeEventListener("guest-cart-changed", syncGuestCart);
  }, []);

  const subtotal = useMemo(() => getGuestCartSubtotal(items), [items]);
  const customerComplete = Object.values(customer).every((value) => value.trim().length > 0);

  const updateField = <K extends keyof GuestOrderCustomer>(field: K, value: GuestOrderCustomer[K]) => {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRemove = (productId: number) => {
    removeGuestCartItem(productId);
    setMessage("");
    setLatestOrderId(null);
  };

  const handleQuantityChange = (productId: number, nextQuantity: number) => {
    updateGuestCartItemQuantity(productId, nextQuantity);
    setMessage("");
    setLatestOrderId(null);
  };

  const handlePaymentError = (errorMessage: string) => {
    setLatestOrderId(null);
    setMessageTone("error");
    setMessage(errorMessage);
  };

  const handlePaystackSuccess = async (reference: string) => {
    if (!customerComplete) {
      setMessageTone("error");
      setMessage("Please complete your delivery details before paying.");
      return;
    }
    if (items.length === 0) {
      setMessageTone("error");
      setMessage("Your guest checkout basket is empty.");
      return;
    }

    setPlacing(true);
    setMessage("");
    setLatestOrderId(null);

    try {
      const order = await orderApi.createGuest({
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
        customer: {
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          email: customer.email.trim().toLowerCase(),
          streetAddress: customer.streetAddress.trim(),
          city: customer.city.trim(),
          state: customer.state.trim(),
          postalCode: customer.postalCode.trim(),
          country: customer.country.trim(),
        },
        paymentIntentId: `PAYSTACK:${reference}`,
      });

      clearGuestCart();
      setItems([]);
      setMessageTone("success");
      setMessage(`Payment successful and guest order placed. Order ID: ${order.id}`);
      setLatestOrderId(order.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Payment succeeded but guest order creation failed.";
      setMessageTone("error");
      setMessage(`${text} Contact support with payment ref ${reference}.`);
    } finally {
      setPlacing(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Guest checkout</p>
          <h2 className="text-2xl font-semibold text-slate-900">Continue without creating an account</h2>
          <p className="mt-1 text-sm text-slate-600">
            You can complete payment now and still create an account later with the same email address.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to="/login">
            Sign in instead
          </Link>
          <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to="/">
            Back to store
          </Link>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${messageTone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          <p>{message}</p>
          {messageTone === "success" && latestOrderId && (
            <p className="mt-1">
              Keep this order ID for support: <strong>{latestOrderId}</strong>.
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-600">Your guest checkout basket is empty.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" onSubmit={onSubmit}>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Delivery details</h3>
              <p className="mt-1 text-sm text-slate-600">We use this information for payment confirmation and delivery coordination.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>First name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Last name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Email address</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                required
                type="email"
                value={customer.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Street address</span>
              <textarea
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                required
                value={customer.streetAddress}
                onChange={(event) => updateField("streetAddress", event.target.value)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>City</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>State</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.state}
                  onChange={(event) => updateField("state", event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Postal code</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Country</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  required
                  type="text"
                  value={customer.country}
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </label>
            </div>
          </form>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Order summary</h3>
              <p className="mt-1 text-sm text-slate-600">Review your selected items before completing payment.</p>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <article className="rounded-2xl border border-slate-200 p-3" key={item.productId}>
                  <div className="flex gap-3">
                    <img
                      alt={item.productName}
                      className="h-20 w-20 rounded-xl bg-slate-100 object-contain"
                      src={item.imageUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-sm text-slate-500">{item.category}</p>
                      <p className="mt-1 text-sm text-slate-700">NGN {item.unitPrice.toFixed(2)} each</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <button
                        className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-base text-slate-700"
                        disabled={item.quantity <= 1}
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button
                        className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-base text-slate-700"
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                      onClick={() => handleRemove(item.productId)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Items</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-semibold text-slate-900">
                <span>Total</span>
                <span>NGN {subtotal.toFixed(2)}</span>
              </div>
            </div>

            <PaystackCheckoutButton
              amountNgn={subtotal}
              buttonLabel="Pay as guest"
              disabled={placing || items.length === 0 || !customerComplete}
              email={customer.email.trim().toLowerCase()}
              onError={handlePaymentError}
              onSuccess={handlePaystackSuccess}
            />

            {placing && <p className="text-sm text-slate-600">Finalizing your guest order...</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export default GuestCheckoutPage;
