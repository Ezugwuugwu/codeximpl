import { FormEvent, useState } from "react";
import { supportService } from "../../services/supportService";
import type { VirtualChatMessage } from "../../types/support";

const initialMessage: VirtualChatMessage = {
  id: "welcome-agent",
  author: "agent",
  text: "Hello, I am your virtual support assistant. How can I help you today?",
  createdAt: new Date().toISOString(),
};

const customerMessage = (text: string): VirtualChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  author: "customer",
  text,
  createdAt: new Date().toISOString(),
});

function VirtualAgentPanel() {
  const [messages, setMessages] = useState<VirtualChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) {
      return;
    }
    const outgoing = customerMessage(trimmed);
    setInput("");
    setBusy(true);
    setMessages((prev) => [...prev, outgoing]);
    const reply = await supportService.sendVirtualMessage(trimmed);
    setMessages((prev) => [...prev, reply]);
    setBusy(false);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-[#eef3f9] p-5 shadow-lg">
      <h3 className="text-xl font-semibold text-slate-900">Virtual Chat Agent</h3>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-[#edf2f8] p-3">
        {messages.map((message) => (
          <article className={`rounded-xl p-3 text-sm ${message.author === "agent" ? "bg-[#eef2ff] text-slate-800" : "bg-[#e9f7ef] text-slate-800"}`} key={message.id}>
            <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${message.author === "agent" ? "text-indigo-700" : "text-emerald-700"}`}>
              {message.author === "agent" ? "Virtual Agent" : "You"}
            </p>
            <p className="mt-1">{message.text}</p>
          </article>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={onSubmit}>
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Type your support question..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44] disabled:opacity-60" disabled={busy || input.trim().length === 0} type="submit">
          {busy ? "Replying..." : "Send"}
        </button>
      </form>
    </section>
  );
}

export default VirtualAgentPanel;
