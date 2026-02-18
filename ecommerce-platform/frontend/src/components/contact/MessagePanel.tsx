import { FormEvent, useState } from "react";
import { supportService } from "../../services/supportService";
import type { ContactMessageReceipt } from "../../types/support";

type MessageFormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const initialForm: MessageFormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

function MessagePanel() {
  const [form, setForm] = useState(initialForm);
  const [receipt, setReceipt] = useState<ContactMessageReceipt | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || form.message.trim().length < 10) {
      setError("Complete all fields. Message must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await supportService.submitMessage(form);
    setReceipt(result);
    setForm(initialForm);
    setSubmitting(false);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <h3 className="text-xl font-semibold">Send Us a Message</h3>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Full Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
        <textarea className="md:col-span-2 min-h-28 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Write your message..." value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
        <button className="md:col-span-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Sending..." : "Send Message"}</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {receipt && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Message received. Reference: {receipt.reference}</p>}
    </section>
  );
}

export default MessagePanel;
