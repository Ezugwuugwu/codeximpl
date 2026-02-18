import { FormEvent, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeError } from "@stripe/stripe-js";

type Props = {
  clientSecret: string;
  onPaymentSuccess: (paymentIntentId: string) => Promise<void>;
  onPaymentError: (message: string) => void;
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#0f172a",
      "::placeholder": {
        color: "#64748b",
      },
    },
    invalid: {
      color: "#dc2626",
    },
  },
};

const formatStripePaymentError = (error?: StripeError) => {
  if (!error) {
    return "Card payment failed.";
  }

  const baseMessage = error.message?.trim() || "Card payment failed.";
  if (error.code === "processing_error") {
    return "Card processor could not complete the payment. Please retry or use test card 4242 4242 4242 4242.";
  }
  if (error.code === "card_declined" && error.decline_code) {
    return `${baseMessage} (decline: ${error.decline_code})`;
  }
  if (error.code) {
    return `${baseMessage} (code: ${error.code})`;
  }
  return baseMessage;
};

function CardCheckoutForm({ clientSecret, onPaymentSuccess, onPaymentError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || processing) {
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      onPaymentError("Card form is not ready yet.");
      return;
    }

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (error) {
        onPaymentError(formatStripePaymentError(error));
        return;
      }
      if (!paymentIntent?.id || paymentIntent.status !== "succeeded") {
        onPaymentError("Payment was not completed. Please try again.");
        return;
      }
      await onPaymentSuccess(paymentIntent.id);
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : "Unexpected payment error. Please retry.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="rounded-xl border border-slate-300 bg-white px-3 py-3">
        <CardElement options={cardElementOptions} />
      </div>
      <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={!stripe || processing} type="submit">
        {processing ? "Processing Payment..." : "Pay with Card and Checkout"}
      </button>
    </form>
  );
}

export default CardCheckoutForm;
