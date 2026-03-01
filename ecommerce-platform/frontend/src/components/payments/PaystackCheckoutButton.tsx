import axios from "axios";
import { useState } from "react";
import { paymentApi } from "../../services/api";
import { getAuthToken, getCurrentUserId } from "../../utils/auth";

// Paystack inline.js types
type PaystackPopSetup = {
  key: string;
  email: string;
  amount: number;       // in kobo (NGN × 100)
  accessCode?: string;  // use pre-initialized access code from backend
  ref?: string;
  onClose: () => void;
  callback: (response: { reference: string }) => unknown;
};

type PaystackPopHandler = { openIframe: () => void };

declare global {
  interface Window {
    PaystackPop: { setup: (setup: PaystackPopSetup) => PaystackPopHandler };
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }
    const existing = document.getElementById("paystack-inline-js");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Paystack script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack checkout"));
    document.head.appendChild(script);
  });
}

type Props = {
  amountNgn: number;
  onSuccess: (reference: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
};

export default function PaystackCheckoutButton({ amountNgn, onSuccess, onError, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const token = getAuthToken();
    const email = getCurrentUserId(); // JWT sub = user email
    if (!token || !email) {
      onError("Please log in to checkout with Paystack.");
      return;
    }

    setLoading(true);
    try {
      await loadPaystackScript();

      const init = await paymentApi.initializePaystack(token, {
        email,
        amount: Number(amountNgn.toFixed(2)),
        currency: "NGN",
      });

      const handler = window.PaystackPop.setup({
        key: init.publicKey,
        email,
        amount: Math.round(amountNgn * 100), // kobo
        accessCode: init.accessCode,
        onClose: () => {
          setLoading(false);
          onError("Payment popup was closed before completion.");
        },
        // Must be a plain (non-async) function — Paystack's SDK rejects AsyncFunction
        // instances. We hand off to the async onSuccess chain and reset loading in .finally().
        callback: (response: { reference: string }) => {
          onSuccess(response.reference).finally(() => setLoading(false));
        },
      });

      handler.openIframe();
    } catch (error) {
      // Prefer the backend's own message (e.g. "Paystack gateway is not configured…")
      // over Axios's generic "Request failed with status code 503"
      const backendMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : axios.isAxiosError(error) && typeof error.response?.data?.detail === "string"
            ? error.response.data.detail
            : "";
      const message = backendMessage || (error instanceof Error ? error.message : "Unable to open Paystack checkout.");
      onError(message);
      setLoading(false);
    }
  };

  return (
    <button
      className="rounded-xl bg-[#0ba360] px-4 py-2 text-sm font-medium text-white hover:bg-[#079a58] disabled:opacity-60"
      disabled={disabled || loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? "Opening Paystack..." : "Pay with Paystack ₦"}
    </button>
  );
}
