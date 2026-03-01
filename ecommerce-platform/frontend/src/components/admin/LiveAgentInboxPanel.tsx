import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supportService } from "../../services/supportService";
import type { LiveAgentChatMessage, LiveAgentSession } from "../../types/support";

const agentNameKey = "okanga_live_agent_name";

const isOpenStatus = (status?: LiveAgentSession["status"]) => status === "QUEUED" || status === "IN_PROGRESS";

const statusTone: Record<LiveAgentSession["status"], string> = {
  QUEUED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-emerald-100 text-emerald-700",
  ENDED: "bg-slate-200 text-slate-700",
  TIMED_OUT: "bg-rose-100 text-rose-700",
};

const formatDateTime = (iso: string) => new Date(iso).toLocaleString();

const senderNameClass = (author: LiveAgentChatMessage["author"]) => {
  if (author === "agent") {
    return "text-indigo-700";
  }
  if (author === "customer") {
    return "text-emerald-700";
  }
  return "text-slate-500";
};

function LiveAgentInboxPanel() {
  const [sessions, setSessions] = useState<LiveAgentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [messages, setMessages] = useState<LiveAgentChatMessage[]>([]);
  const [agentName, setAgentName] = useState(() => localStorage.getItem(agentNameKey) || "Support Agent");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Ref holds the latest selectedSessionId without stale closures
  const selectedSessionIdRef = useRef("");
  selectedSessionIdRef.current = selectedSessionId;

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) || null,
    [selectedSessionId, sessions]
  );
  const chatActive = useMemo(() => isOpenStatus(selectedSession?.status), [selectedSession?.status]);

  const loadSessions = useCallback(async () => {
    try {
      const next = await supportService.listLiveSessions();
      setSessions(next);
      setUnreadCount(supportService.getUnreadSessionCount(next));

      const currentId = selectedSessionIdRef.current;
      const chosen =
        currentId && next.some((s) => s.sessionId === currentId)
          ? currentId
          : next[0]?.sessionId || "";

      setSelectedSessionId(chosen);
      if (chosen) {
        const msgs = await supportService.listLiveMessages(chosen);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch {
      // Network error — keep existing state
    }
  }, []);

  useEffect(() => {
    loadSessions();

    window.addEventListener("support:store-updated", loadSessions);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("okanga_support");
      channel.onmessage = () => void loadSessions();
    }

    const timer = window.setInterval(() => void loadSessions(), 3000);

    return () => {
      window.removeEventListener("support:store-updated", loadSessions);
      channel?.close();
      window.clearInterval(timer);
    };
  }, [loadSessions]);

  useEffect(() => {
    localStorage.setItem(agentNameKey, agentName);
  }, [agentName]);

  const selectSession = async (sessionId: string) => {
    selectedSessionIdRef.current = sessionId;
    setSelectedSessionId(sessionId);
    supportService.markSessionRead(sessionId);
    try {
      const msgs = await supportService.listLiveMessages(sessionId);
      setMessages(msgs);
      // Refresh unread count after marking read
      const next = await supportService.listLiveSessions();
      setSessions(next);
      setUnreadCount(supportService.getUnreadSessionCount(next));
    } catch {
      setMessages([]);
    }
  };

  const onJoinChat = async () => {
    if (!selectedSessionId) return;
    setError("");
    const joined = await supportService.joinLiveSession(selectedSessionId, agentName);
    if (!joined) {
      setError("Could not join this chat.");
      return;
    }
    await loadSessions();
  };

  const onSendReply = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed || !selectedSessionId) return;
    setError("");
    const sent = await supportService.sendAgentLiveMessage(selectedSessionId, trimmed, agentName);
    if (!sent) {
      setError("Reply could not be sent.");
      return;
    }
    setReply("");
    const msgs = await supportService.listLiveMessages(selectedSessionId);
    setMessages(msgs);
  };

  const onEndChat = async () => {
    if (!selectedSessionId) return;
    setError("");
    const ended = await supportService.endLiveSession(
      selectedSessionId,
      "agent",
      `${agentName || "Support Agent"} ended this chat.`
    );
    if (!ended) {
      setError("Chat is already closed.");
      return;
    }
    await loadSessions();
  };

  const onClearInbox = async () => {
    await supportService.clearAllLiveSessions();
    selectedSessionIdRef.current = "";
    setSelectedSessionId("");
    setMessages([]);
    setError("");
    setSessions([]);
    setUnreadCount(0);
  };

  return (
    <section id="live-agent-inbox" className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-[#eef3f9] p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          Live Agent Inbox
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Agent display name"
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
          />
          {sessions.length > 0 && (
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={onClearInbox}
              type="button"
            >
              Clear Inbox
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
          No live-agent requests yet.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <aside className="space-y-2">
            {sessions.map((session) => (
              <button
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedSessionId === session.sessionId
                    ? "border-[#1f3550] bg-[#e9eff8]"
                    : "border-slate-200 bg-white/80 hover:bg-slate-50"
                }`}
                key={session.sessionId}
                onClick={() => void selectSession(session.sessionId)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-slate-900">{session.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone[session.status]}`}>
                    {session.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{session.email}</p>
                <p className="mt-1 text-xs text-slate-500">Ticket {session.ticketId}</p>
              </button>
            ))}
          </aside>

          {selectedSession ? (
            <article className="space-y-3 rounded-2xl border border-slate-200 bg-[#f7fafc] p-4">
              <header className="grid gap-2 text-sm font-medium text-slate-700 md:grid-cols-2">
                <p><span className="font-semibold">Customer:</span> {selectedSession.name}</p>
                <p><span className="font-semibold">Email:</span> {selectedSession.email}</p>
                <p><span className="font-semibold">Queue:</span> {selectedSession.assignedQueue}</p>
                <p><span className="font-semibold">Opened:</span> {formatDateTime(selectedSession.createdAt)}</p>
                <p><span className="font-semibold">Order ID:</span> {selectedSession.orderId || "N/A"}</p>
                <p><span className="font-semibold">Preferred contact:</span> {selectedSession.preferredContact}</p>
              </header>

              <div className="max-h-[22rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-[#edf2f8] p-3">
                {messages.map((message) => (
                  <div className={`flex ${message.author === "agent" ? "justify-end" : "justify-start"}`} key={message.id}>
                    <article
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        message.author === "agent"
                          ? "bg-[#eef2ff] text-slate-800"
                          : message.author === "system"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-[#e9f7ef] text-slate-800"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${senderNameClass(message.author)}`}>
                        {message.author === "agent" ? (message.senderName || selectedSession.assignedAgentName || "Agent") : message.author === "customer" ? (message.senderName || selectedSession.name) : "System"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(message.createdAt)}</p>
                    </article>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSession.status === "QUEUED" && (
                  <button className="rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44]" onClick={() => void onJoinChat()} type="button">
                    Join Chat
                  </button>
                )}
                {chatActive && (
                  <button className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50" onClick={() => void onEndChat()} type="button">
                    End Chat
                  </button>
                )}
              </div>

              {chatActive ? (
                <form className="flex flex-wrap gap-2" onSubmit={(e) => void onSendReply(e)}>
                  <input
                    className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <button className="rounded-xl bg-[#1f3550] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b2d44] disabled:opacity-60" disabled={reply.trim().length === 0} type="submit">
                    Send Reply
                  </button>
                </form>
              ) : (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                  This chat is closed. Status: {selectedSession.status}.
                </p>
              )}
            </article>
          ) : null}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

export default LiveAgentInboxPanel;
