import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import CardCheckoutForm from "../components/payments/CardCheckoutForm";
import { useCart } from "../context/CartContext";
import { paymentApi } from "../services/api";
import { getAuthToken, getCurrentUserId } from "../utils/auth";

function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, removeFromCart, clearCart, placeOrder } = useCart();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [placing, setPlacing] = useState(false);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const items = cart?.items ?? [];
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0),
    [items]
  );

  useEffect(() => {
    setClientSecret("");
    setPaymentIntentId("");
    setStripePromise(null);
  }, [subtotal, items.length]);

  const onRemove = async (productId: number) => {
    try {
      await removeFromCart(productId);
      setMessage("");
    } catch {
      setMessageTone("error");
      setMessage("Could not remove item from cart.");
    }
  };

  const onClear = async () => {
    try {
      await clearCart();
      setMessageTone("success");
      setMessage("Cart cleared.");
    } catch {
      setMessageTone("error");
      setMessage("Could not clear cart.");
    }
  };

  const onPrepareCardCheckout = async () => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      setMessageTone("error");
      setMessage("Login required to checkout.");
      return;
    }
    if (subtotal <= 0) {
      setMessageTone("error");
      setMessage("Cart is empty.");
      return;
    }

    setPreparingPayment(true);
    setMessage("");
    try {
      const intent = await paymentApi.createIntent(token, {
        userId,
        amount: Number(subtotal.toFixed(2)),
        currency: "USD",
      });
      setClientSecret(intent.clientSecret);
      setPaymentIntentId(intent.paymentIntentId);
      setStripePromise(loadStripe(intent.publishableKey));
      setMessageTone("success");
      setMessage("Card checkout initialized. Enter your card details below.");
    } catch (error) {
      const providerMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "";
      const text = providerMessage || (error instanceof Error ? error.message : "Unable to initialize card checkout.");
      setMessageTone("error");
      setMessage(text);
    } finally {
      setPreparingPayment(false);
    }
  };

  const onPaymentSuccess = async (confirmedPaymentIntentId: string) => {
    setPlacing(true);
    setMessage("");
    try {
      const order = await placeOrder(confirmedPaymentIntentId || paymentIntentId);
      setMessageTone("success");
      setMessage(`Payment successful and order placed. Order ID: ${order.id}`);
      setClientSecret("");
      setPaymentIntentId("");
      setStripePromise(null);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Payment succeeded but order creation failed.";
      setMessageTone("error");
      setMessage(`${text} Contact support with payment ref ${confirmedPaymentIntentId}.`);
    } finally {
      setPlacing(false);
    }
  };

  const onPaymentError = (errorMessage: string) => {
    setMessageTone("error");
    setMessage(errorMessage);
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading cart...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Cart</h2>
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to="/">
          Continue Shopping
        </Link>
      </div>

      {message && (
        <p className={`rounded-xl p-3 text-sm ${messageTone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-lg">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
            {items.map((item) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50 last:border-b-0"
                key={item.productId}
                onClick={() => navigate(`/products/${item.productId}?from=cart`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/products/${item.productId}?from=cart`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                  <p className="text-xs text-slate-400">Click this item to edit quantity</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-600">
                    ${Number(item.unitPrice).toFixed(2)} x {item.quantity}
                  </p>
                  <p className="font-semibold">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</p>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/products/${item.productId}?from=cart`);
                    }}
                    type="button"
                  >
                    Edit quantity
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onRemove(item.productId);
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <p className="text-lg font-semibold">Subtotal: ${subtotal.toFixed(2)}</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" onClick={onClear} type="button">
                Clear Cart
              </button>
              {!clientSecret && (
                <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={preparingPayment} onClick={onPrepareCardCheckout} type="button">
                  {preparingPayment ? "Initializing Payment..." : "Checkout with Card"}
                </button>
              )}
            </div>

            {clientSecret && stripePromise && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Card Payment</p>
                <p className="text-sm text-slate-600">Use your credit or debit card. Your payment is processed securely.</p>
                <Elements options={{ clientSecret }} stripe={stripePromise}>
                  <CardCheckoutForm clientSecret={clientSecret} onPaymentError={onPaymentError} onPaymentSuccess={onPaymentSuccess} />
                </Elements>
                {placing && <p className="text-sm text-slate-600">Finalizing your order...</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default CartPage;
