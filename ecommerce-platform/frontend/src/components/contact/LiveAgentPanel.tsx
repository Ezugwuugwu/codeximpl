import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

const senderNameClass = (author: LiveAgentChatMessage["author"]) => {
  if (author === "customer") {
    return "text-emerald-700";
  }
  if (author === "agent") {
    return "text-indigo-700";
  }
  return "text-slate-500";
};

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

  const loadSession = useCallback(async () => {
    const id = localStorage.getItem(sessionStorageKey);
    if (!id) {
      setSession(null);
      setMessages([]);
      return;
    }
    try {
      const nextSession = await supportService.getLiveSession(id);
      if (!nextSession) {
        setSession(null);
        setMessages([]);
        localStorage.removeItem(sessionStorageKey);
        setSessionId("");
        return;
      }
      setSession(nextSession);
      const msgs = await supportService.listLiveMessages(id);
      setMessages(msgs);
    } catch {
      // Keep existing state on network error
    }
  }, []);

  useEffect(() => {
    void loadSession();

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("okanga_support");
      channel.onmessage = () => void loadSession();
    }

    const timer = window.setInterval(() => void loadSession(), 3000);

    return () => {
      channel?.close();
      window.clearInterval(timer);
    };
  }, [loadSession, sessionId]);

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

  const onSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || !sessionId || sending || !chatActive) return;
    setSending(true);
    setError("");
    try {
      const sent = await supportService.sendCustomerLiveMessage(sessionId, trimmed);
      if (!sent) {
        setError("Chat is no longer active. Please request a new live agent.");
        return;
      }
      setChatInput("");
      await loadSession();
    } catch {
      setError("Message could not be sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  const onEndChat = async () => {
    if (!sessionId || !chatActive) return;
    await supportService.endLiveSession(sessionId, "customer", "Customer ended the chat.");
    await loadSession();
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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-[#eef3f9] p-5 shadow-lg">
      <h3 className="text-xl font-semibold text-slate-900">Live Agent Chat</h3>

      {!chatActive && !session && (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onRequestLiveAgent(e)}>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Full Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Order ID (optional)" value={form.orderId || ""} onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))} />
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={form.preferredContact} onChange={(e) => setForm((p) => ({ ...p, preferredContact: e.target.value as "email" | "phone" }))}>
            <option value="email">Preferred Contact: Email</option>
            <option value="phone">Preferred Contact: Phone</option>
          </select>
          <textarea className="md:col-span-2 min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Describe your issue..." value={form.issue} onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))} />
          <button className="md:col-span-2 rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44] disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Creating ticket..." : "Request Live Agent"}
          </button>
        </form>
      )}

      {session && (
        <article className="space-y-3 rounded-2xl border border-slate-200 bg-[#f7fafc] p-4">
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
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Our customer care agent will join you in {session.estimatedWaitMinutes} minutes.
            </p>
          )}

          <div className="max-h-[22rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-[#edf2f8] p-3">
            {messages.map((message) => (
              <div className={`flex ${message.author === "customer" ? "justify-end" : "justify-start"}`} key={message.id}>
                <article
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.author === "customer"
                      ? "bg-[#e9f7ef] text-slate-800"
                      : message.author === "system"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-[#eef2ff] text-slate-800"
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${senderNameClass(message.author)}`}>
                    {message.author === "customer" ? "You" : message.author === "agent" ? (message.senderName || session.assignedAgentName || "Agent") : "System"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{formatChatTime(message.createdAt)}</p>
                </article>
              </div>
            ))}
          </div>

          {chatActive ? (
            <div className="space-y-2">
              <form className="flex flex-wrap gap-2" onSubmit={(e) => void onSendMessage(e)}>
                <input
                  className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <button className="rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44] disabled:opacity-60" disabled={sending || chatInput.trim().length === 0} type="submit">
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
              <button className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50" onClick={() => void onEndChat()} type="button">
                End Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                {session.status === "TIMED_OUT" ? "This chat closed automatically due to inactivity." : "This chat was ended."}
              </p>
              <button className="rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44]" onClick={onStartNewChat} type="button">
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
