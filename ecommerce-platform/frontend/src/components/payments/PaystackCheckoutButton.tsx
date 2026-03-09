import axios from "axios";
import { useState } from "react";
import { paymentApi } from "../../services/api";
import { getAuthSession } from "../../utils/auth";

type PaystackPopSetup = {
  key: string;
  email: string;
  amount: number;
  accessCode?: string;
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
  email?: string;
  token?: string;
  buttonLabel?: string;
};

export default function PaystackCheckoutButton({
  amountNgn,
  onSuccess,
  onError,
  disabled,
  email,
  token,
  buttonLabel,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const session = getAuthSession();
    const resolvedToken = token ?? session.token ?? undefined;
    const resolvedEmail = email ?? session.email;

    if (!resolvedEmail) {
      onError("Please provide an email address before starting payment.");
      return;
    }

    setLoading(true);
    try {
      await loadPaystackScript();

      const init = await paymentApi.initializePaystack(resolvedToken, {
        email: resolvedEmail,
        amount: Number(amountNgn.toFixed(2)),
        currency: "NGN",
      });

      const handler = window.PaystackPop.setup({
        key: init.publicKey,
        email: resolvedEmail,
        amount: Math.round(amountNgn * 100),
        accessCode: init.accessCode,
        onClose: () => {
          setLoading(false);
          onError("Payment popup was closed before completion.");
        },
        callback: (response: { reference: string }) => {
          onSuccess(response.reference).finally(() => setLoading(false));
        },
      });

      handler.openIframe();
    } catch (error) {
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
      {loading ? "Opening Paystack..." : buttonLabel ?? "Pay with Paystack"}
    </button>
  );
}
