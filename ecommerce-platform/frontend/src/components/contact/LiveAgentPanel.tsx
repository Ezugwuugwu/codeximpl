import { FormEvent, useEffect, useMemo, useState } from "react";
import { supportService } from "../../services/supportService";
import type { LiveAgentChatMessage, LiveAgentRequest, LiveAgentSession } from "../../types/support";

const sessionStorageKey = "okanga_live_session_id";

const initialForm: LiveAgentRequest = {
  name: "",
  email: "",
  orderId: "",
  issue: "",
  preferredContact: "email",
};

const isOpenStatus = (status?: LiveAgentSession["status"]) => status === "QUEUED" || status === "IN_PROGRESS";

const statusLabel: Record<LiveAgentSession["status"], string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  ENDED: "Ended",
  TIMED_OUT: "Timed Out",
};

const formatChatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function LiveAgentPanel() {
  const [form, setForm] = useState(initialForm);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(sessionStorageKey) || "");
  const [session, setSession] = useState<LiveAgentSession | null>(null);
  const [messages, setMessages] = useState<LiveAgentChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  const chatActive = useMemo(() => isOpenStatus(session?.status), [session?.status]);

  useEffect(() => {
    const loadSession = () => {
      if (!sessionId) {
        setSession(null);
        setMessages([]);
        return;
      }
      const nextSession = supportService.getLiveSession(sessionId);
      if (!nextSession) {
        setSession(null);
        setMessages([]);
        localStorage.removeItem(sessionStorageKey);
        setSessionId("");
        return;
      }
      setSession(nextSession);
      setMessages(supportService.listLiveMessages(sessionId));
    };

    loadSession();
    const onStoreUpdate = () => loadSession();
    window.addEventListener("support:store-updated", onStoreUpdate);
    const timer = window.setInterval(() => {
      supportService.autoCloseIdleSessions();
      loadSession();
    }, 15000);
    return () => {
      window.removeEventListener("support:store-updated", onStoreUpdate);
      window.clearInterval(timer);
    };
  }, [sessionId]);

  const onRequestLiveAgent = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.issue.trim()) {
      setError("Name, email, and issue details are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const ticket = await supportService.requestLiveAgent(form);
      localStorage.setItem(sessionStorageKey, ticket.sessionId);
      setSessionId(ticket.sessionId);
      setForm(initialForm);
    } catch {
      setError("We could not submit your live-agent request. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSendMessage = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || !sessionId || sending || !chatActive) {
      return;
    }
    setSending(true);
    setError("");
    try {
      const sent = supportService.sendCustomerLiveMessage(sessionId, trimmed);
      if (!sent) {
        setError("Chat is no longer active. Please request a new live agent.");
        return;
      }
      setChatInput("");
    } catch {
      setError("Message could not be sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  const onEndChat = () => {
    if (!sessionId || !chatActive) {
      return;
    }
    supportService.endLiveSession(sessionId, "customer", "Customer ended the chat.");
  };

  const onStartNewChat = () => {
    localStorage.removeItem(sessionStorageKey);
    setSessionId("");
    setSession(null);
    setMessages([]);
    setChatInput("");
    setError("");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <h3 className="text-xl font-semibold">Live Agent Chat</h3>

      {!chatActive && (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onRequestLiveAgent}>
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Full Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Order ID (optional)" value={form.orderId || ""} onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))} />
          <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.preferredContact} onChange={(e) => setForm((p) => ({ ...p, preferredContact: e.target.value as "email" | "phone" }))}>
            <option value="email">Preferred Contact: Email</option>
            <option value="phone">Preferred Contact: Phone</option>
          </select>
          <textarea className="md:col-span-2 min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Describe your issue..." value={form.issue} onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))} />
          <button className="md:col-span-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Creating ticket..." : "Request Live Agent"}
          </button>
        </form>
      )}

      {session && (
        <article className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Ticket {session.ticketId}</p>
              <p className="text-sm text-slate-600">
                Queue: {session.assignedQueue} | Agent: {session.assignedAgentName || "Awaiting assignment"}
              </p>
            </div>
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {statusLabel[session.status]}
            </span>
          </header>

          {session.status === "QUEUED" && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              Our customer care agent will join you in {session.estimatedWaitMinutes} minutes.
            </p>
          )}

          <div className="max-h-[22rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-[#e5ddd5] p-3">
            {messages.map((message) => (
              <div className={`flex ${message.author === "customer" ? "justify-end" : "justify-start"}`} key={message.id}>
                <article
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.author === "customer"
                      ? "bg-[#dcf8c6] text-slate-800"
                      : message.author === "system"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-white text-slate-800"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {message.author === "customer" ? "You" : message.author === "agent" ? "Agent" : "System"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{formatChatTime(message.createdAt)}</p>
                </article>
              </div>
            ))}
          </div>

          {chatActive ? (
            <div className="space-y-2">
              <form className="flex flex-wrap gap-2" onSubmit={onSendMessage}>
                <input
                  className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={sending || chatInput.trim().length === 0} type="submit">
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
              <button className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700" onClick={onEndChat} type="button">
                End Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                {session.status === "TIMED_OUT" ? "This chat closed automatically due to inactivity." : "This chat was ended."}
              </p>
              <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white" onClick={onStartNewChat} type="button">
                Start New Live Chat
              </button>
            </div>
          )}
        </article>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

export default LiveAgentPanel;
