import { FormEvent, useEffect, useMemo, useState } from "react";
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

function LiveAgentInboxPanel() {
  const [sessions, setSessions] = useState<LiveAgentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [messages, setMessages] = useState<LiveAgentChatMessage[]>([]);
  const [agentName, setAgentName] = useState(() => localStorage.getItem(agentNameKey) || "Support Agent");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) || null,
    [selectedSessionId, sessions]
  );
  const chatActive = useMemo(() => isOpenStatus(selectedSession?.status), [selectedSession?.status]);

  useEffect(() => {
    const loadSessions = () => {
      const next = supportService.listLiveSessions();
      setSessions(next);
      setSelectedSessionId((current) => {
        if (current && next.some((session) => session.sessionId === current)) {
          return current;
        }
        return next[0]?.sessionId || "";
      });
    };

    loadSessions();
    const onStoreUpdate = () => loadSessions();
    window.addEventListener("support:store-updated", onStoreUpdate);
    const timer = window.setInterval(() => {
      supportService.autoCloseIdleSessions();
      loadSessions();
    }, 15000);
    return () => {
      window.removeEventListener("support:store-updated", onStoreUpdate);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(agentNameKey, agentName);
  }, [agentName]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }
    setMessages(supportService.listLiveMessages(selectedSessionId));
  }, [selectedSessionId, sessions]);

  const onJoinChat = () => {
    if (!selectedSessionId) {
      return;
    }
    setError("");
    const joined = supportService.joinLiveSession(selectedSessionId, agentName);
    if (!joined) {
      setError("Could not join this chat.");
    }
  };

  const onSendReply = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed || !selectedSessionId) {
      return;
    }
    setError("");
    const sent = supportService.sendAgentLiveMessage(selectedSessionId, trimmed, agentName);
    if (!sent) {
      setError("Reply could not be sent.");
      return;
    }
    setReply("");
  };

  const onEndChat = () => {
    if (!selectedSessionId) {
      return;
    }
    setError("");
    const ended = supportService.endLiveSession(
      selectedSessionId,
      "agent",
      `${agentName || "Support Agent"} ended this chat.`
    );
    if (!ended) {
      setError("Chat is already closed.");
    }
  };

  return (
    <section id="live-agent-inbox" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Live Agent Inbox</h3>
        <input
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Agent display name"
          value={agentName}
          onChange={(event) => setAgentName(event.target.value)}
        />
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No live-agent requests yet.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <aside className="space-y-2">
            {sessions.map((session) => (
              <button
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedSessionId === session.sessionId
                    ? "border-ink bg-ink/5"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
                key={session.sessionId}
                onClick={() => setSelectedSessionId(session.sessionId)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{session.name}</p>
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
            <article className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <header className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p><span className="font-semibold">Customer:</span> {selectedSession.name}</p>
                <p><span className="font-semibold">Email:</span> {selectedSession.email}</p>
                <p><span className="font-semibold">Queue:</span> {selectedSession.assignedQueue}</p>
                <p><span className="font-semibold">Opened:</span> {formatDateTime(selectedSession.createdAt)}</p>
                <p><span className="font-semibold">Order ID:</span> {selectedSession.orderId || "N/A"}</p>
                <p><span className="font-semibold">Preferred contact:</span> {selectedSession.preferredContact}</p>
              </header>

              <div className="max-h-[22rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-[#e5ddd5] p-3">
                {messages.map((message) => (
                  <div className={`flex ${message.author === "agent" ? "justify-end" : "justify-start"}`} key={message.id}>
                    <article
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        message.author === "agent"
                          ? "bg-[#dcf8c6] text-slate-800"
                          : message.author === "system"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-white text-slate-800"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {message.author === "agent" ? (selectedSession.assignedAgentName || "Agent") : message.author}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(message.createdAt)}</p>
                    </article>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSession.status === "QUEUED" && (
                  <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white" onClick={onJoinChat} type="button">
                    Join Chat
                  </button>
                )}
                {chatActive && (
                  <button className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700" onClick={onEndChat} type="button">
                    End Chat
                  </button>
                )}
              </div>

              {chatActive ? (
                <form className="flex flex-wrap gap-2" onSubmit={onSendReply}>
                  <input
                    className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={reply.trim().length === 0} type="submit">
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
