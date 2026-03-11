import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PaystackCheckoutButton from "../components/payments/PaystackCheckoutButton";
import { useCart } from "../context/CartContext";
import { AUTH_TOKEN_STORAGE_KEY, buildAuthEntryPath, getAuthSession, GUEST_SESSION_STORAGE_KEY } from "../utils/auth";
import {
  clearGuestCart,
  GUEST_CART_STORAGE_KEY,
  getGuestCartSubtotal,
  readGuestCart,
  removeGuestCartItem,
  type GuestCartItem,
} from "../utils/guestCart";

function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, removeFromCart, clearCart, placeOrder } = useCart();
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(() => readGuestCart());
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const showingGuestCart = !authSession.isAuthenticated && (authSession.isGuest || guestItems.length > 0);
  const items = showingGuestCart ? guestItems : cart?.items ?? [];
  const loginPath = buildAuthEntryPath("login", "/cart", "cart");

  const subtotal = useMemo(
    () => (
      showingGuestCart
        ? getGuestCartSubtotal(guestItems)
        : items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
    ),
    [guestItems, items, showingGuestCart]
  );

  useEffect(() => {
    const syncAuthSession = () => setAuthSession(getAuthSession());
    const syncGuestItems = () => setGuestItems(readGuestCart());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === AUTH_TOKEN_STORAGE_KEY || event.key === GUEST_SESSION_STORAGE_KEY) {
        syncAuthSession();
      }
      if (!event.key || event.key === GUEST_CART_STORAGE_KEY) {
        syncGuestItems();
      }
    };

    window.addEventListener("auth-changed", syncAuthSession);
    window.addEventListener("guest-cart-changed", syncGuestItems);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-changed", syncAuthSession);
      window.removeEventListener("guest-cart-changed", syncGuestItems);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const onRemove = async (productId: number) => {
    setLatestOrderId(null);
    if (showingGuestCart) {
      removeGuestCartItem(productId);
      setMessage("");
      return;
    }

    try {
      await removeFromCart(productId);
      setMessage("");
    } catch {
      setMessageTone("error");
      setMessage("Could not remove item from cart.");
    }
  };

  const onClear = async () => {
    setLatestOrderId(null);
    if (showingGuestCart) {
      clearGuestCart();
      setMessageTone("success");
      setMessage("Guest cart cleared.");
      return;
    }

    try {
      await clearCart();
      setMessageTone("success");
      setMessage("Cart cleared.");
    } catch {
      setMessageTone("error");
      setMessage("Could not clear cart.");
    }
  };

  const onPaymentError = (errorMessage: string) => {
    setLatestOrderId(null);
    setMessageTone("error");
    setMessage(errorMessage);
  };

  const onPaystackSuccess = async (reference: string) => {
    setPlacing(true);
    setMessage("");
    setLatestOrderId(null);
    try {
      const order = await placeOrder("PAYSTACK:" + reference);
      setMessageTone("success");
      setMessage(`Payment successful and order placed. Order ID: ${order.id}`);
      setLatestOrderId(String(order.id));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Payment succeeded but order creation failed.";
      setMessageTone("error");
      setMessage(`${text} Contact support with payment ref ${reference}.`);
    } finally {
      setPlacing(false);
    }
  };

  if (!showingGuestCart && loading) {
    return <p className="text-sm text-slate-600">Loading cart...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{showingGuestCart ? "Guest Cart" : "Cart"}</h2>
          {showingGuestCart && (
            <p className="mt-1 text-sm text-slate-600">
              Guest checkout is active. You can keep shopping and pay for all items together.
            </p>
          )}
        </div>
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to="/">
          Continue Shopping
        </Link>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${messageTone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          <p>{message}</p>
          {messageTone === "success" && latestOrderId && (
            <p className="mt-1">
              Your order will be on the way soon.{" "}
              <Link className="font-bold text-blue-700 underline decoration-2 underline-offset-2 hover:text-blue-800" to="/admin#orders">
                Click here
              </Link>{" "}
              to track your order.
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-lg">
          {showingGuestCart ? "Your guest cart is empty." : "Your cart is empty."}
        </p>
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
                    NGN {Number(item.unitPrice).toFixed(2)} x {item.quantity}
                  </p>
                  <p className="font-semibold">NGN {(Number(item.unitPrice) * item.quantity).toFixed(2)}</p>
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
            <p className="text-lg font-semibold">Subtotal: NGN {subtotal.toFixed(2)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                onClick={onClear}
                type="button"
              >
                {showingGuestCart ? "Clear Guest Cart" : "Clear Cart"}
              </button>
              {showingGuestCart ? (
                <>
                  <Link
                    className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    to="/guest-checkout"
                  >
                    Proceed to Guest Checkout
                  </Link>
                  <Link
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    to={loginPath}
                  >
                    Sign In Instead
                  </Link>
                </>
              ) : (
                <PaystackCheckoutButton
                  amountNgn={subtotal}
                  disabled={placing}
                  onError={onPaymentError}
                  onSuccess={onPaystackSuccess}
                />
              )}
            </div>
            {showingGuestCart ? (
              <p className="text-sm text-slate-600">Your guest basket stays available while you continue shopping.</p>
            ) : (
              placing && <p className="text-sm text-slate-600">Finalizing your order...</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default CartPage;
