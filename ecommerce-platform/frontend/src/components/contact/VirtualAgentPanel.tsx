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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <h3 className="text-xl font-semibold">Virtual Chat Agent</h3>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {messages.map((message) => (
          <article className={`rounded-xl p-3 text-sm ${message.author === "agent" ? "bg-white text-slate-700" : "bg-ink text-white"}`} key={message.id}>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">{message.author === "agent" ? "Virtual Agent" : "You"}</p>
            <p className="mt-1">{message.text}</p>
          </article>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={onSubmit}>
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Type your support question..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy || input.trim().length === 0} type="submit">
          {busy ? "Replying..." : "Send"}
        </button>
      </form>
    </section>
  );
}

export default VirtualAgentPanel;
