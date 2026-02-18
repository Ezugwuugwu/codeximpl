import type {
  ContactMessageReceipt,
  ContactMessageRequest,
  LiveAgentChatMessage,
  LiveAgentRequest,
  LiveAgentSession,
  LiveAgentTicket,
  LiveChatEndedBy,
  LiveChatStatus,
  VirtualChatMessage,
} from "../types/support";

type SupportStore = {
  tickets: LiveAgentTicket[];
  liveSessions: LiveAgentSession[];
  liveMessages: LiveAgentChatMessage[];
  messages: Array<ContactMessageReceipt & ContactMessageRequest>;
};

const supportStoreKey = "okanga_support_center_v1";
const LIVE_CHAT_IDLE_MINUTES = 5;
const emptyStore = (): SupportStore => ({ tickets: [], liveSessions: [], liveMessages: [], messages: [] });
const nowIso = () => new Date().toISOString();

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const normalizeStore = (parsed: unknown): SupportStore => {
  if (!parsed || typeof parsed !== "object") {
    return emptyStore();
  }
  const store = parsed as Partial<SupportStore>;
  return {
    tickets: asArray<LiveAgentTicket>(store.tickets),
    liveSessions: asArray<LiveAgentSession>(store.liveSessions),
    liveMessages: asArray<LiveAgentChatMessage>(store.liveMessages),
    messages: asArray<ContactMessageReceipt & ContactMessageRequest>(store.messages),
  };
};

const readStore = (): SupportStore => {
  try {
    const raw = localStorage.getItem(supportStoreKey);
    if (!raw) {
      return emptyStore();
    }
    return normalizeStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: SupportStore) => {
  localStorage.setItem(supportStoreKey, JSON.stringify(store));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createReference = (prefix: "AGT" | "MSG" | "SES" | "LIV") => {
  const seed = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${seed.slice(-10).toUpperCase()}`;
};

const emitSupportUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("support:store-updated"));
  }
};

const isLiveSessionOpen = (status: LiveChatStatus) => status === "QUEUED" || status === "IN_PROGRESS";

const getLiveQueue = (issue: string) => (/payment|charge|refund/i.test(issue) ? "Billing Queue" : "General Support Queue");

const sortSessionsByActivity = (sessions: LiveAgentSession[]) =>
  [...sessions].sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));

const addLiveMessage = (
  store: SupportStore,
  sessionId: string,
  author: LiveAgentChatMessage["author"],
  text: string
) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  store.liveMessages.push({
    id: createReference("LIV"),
    sessionId,
    author,
    text: trimmed,
    createdAt: nowIso(),
  });
};

const updateLiveSession = (
  store: SupportStore,
  sessionId: string,
  updater: (session: LiveAgentSession) => LiveAgentSession
) => {
  const index = store.liveSessions.findIndex((session) => session.sessionId === sessionId);
  if (index < 0) {
    return null;
  }
  const updated = updater(store.liveSessions[index]);
  store.liveSessions[index] = updated;
  return updated;
};

const closeIdleLiveSessions = (store: SupportStore, idleMinutes: number) => {
  const cutoff = Date.now() - idleMinutes * 60_000;
  const timedOut: string[] = [];
  store.liveSessions = store.liveSessions.map((session) => {
    if (!isLiveSessionOpen(session.status)) {
      return session;
    }
    const lastActivity = Date.parse(session.lastActivityAt);
    if (!Number.isFinite(lastActivity) || lastActivity >= cutoff) {
      return session;
    }
    timedOut.push(session.sessionId);
    const closedAt = nowIso();
    return { ...session, status: "TIMED_OUT", endedAt: closedAt, endedBy: "system", lastActivityAt: closedAt };
  });
  timedOut.forEach((sessionId) => addLiveMessage(store, sessionId, "system", "Chat ended automatically due to inactivity."));
  return timedOut.length;
};

const ensureLiveSessionState = (store: SupportStore) => {
  const closedCount = closeIdleLiveSessions(store, LIVE_CHAT_IDLE_MINUTES);
  if (closedCount > 0) {
    writeStore(store);
    emitSupportUpdate();
  }
};

const getVirtualReply = (input: string) => {
  const text = input.toLowerCase();
  if (/refund|return|money back/.test(text)) {
    return "For refunds/returns, open your order from Cart > history and choose Return Request. I can also connect you to a live agent.";
  }
  if (/track|where.*order|delivery status/.test(text)) {
    return "To track an order, go to Admin > Orders Placed (or your order history), then check latest status updates there.";
  }
  if (/payment|charged|card/.test(text)) {
    return "For payment issues, verify card details and retry once. If still failing, I can escalate this to a live payment support agent.";
  }
  if (/live|human|agent/.test(text)) {
    return "You can switch to the Live Agent tab now and raise a ticket. We will queue you immediately.";
  }
  return "I can help with order tracking, refunds, payment issues, deliveries, and product questions. Tell me what happened.";
};

export const supportService = {
  async sendVirtualMessage(input: string): Promise<VirtualChatMessage> {
    await delay(300);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: "agent",
      text: getVirtualReply(input),
      createdAt: nowIso(),
    };
  },

  async requestLiveAgent(payload: LiveAgentRequest): Promise<LiveAgentTicket> {
    await delay(450);
    const queue = getLiveQueue(payload.issue);
    const createdAt = nowIso();
    const sessionId = createReference("SES");
    const ticketId = createReference("AGT");
    const ticket: LiveAgentTicket = {
      sessionId,
      ticketId,
      status: "QUEUED",
      estimatedWaitMinutes: 4 + Math.floor(Math.random() * 8),
      assignedQueue: queue,
      createdAt,
    };
    const session: LiveAgentSession = {
      sessionId,
      ticketId,
      name: payload.name.trim(),
      email: payload.email.trim(),
      orderId: payload.orderId?.trim() || undefined,
      preferredContact: payload.preferredContact,
      assignedQueue: queue,
      status: "QUEUED",
      estimatedWaitMinutes: ticket.estimatedWaitMinutes,
      createdAt,
      lastActivityAt: createdAt,
    };
    const store = readStore();
    ensureLiveSessionState(store);
    store.tickets.unshift(ticket);
    store.liveSessions.unshift(session);
    addLiveMessage(store, sessionId, "customer", payload.issue);
    addLiveMessage(store, sessionId, "system", "Live agent request received. An agent will join shortly.");
    writeStore(store);
    emitSupportUpdate();
    return ticket;
  },

  listLiveSessions(): LiveAgentSession[] {
    const store = readStore();
    ensureLiveSessionState(store);
    return sortSessionsByActivity(store.liveSessions);
  },

  getLiveSession(sessionId: string): LiveAgentSession | null {
    const store = readStore();
    ensureLiveSessionState(store);
    return store.liveSessions.find((session) => session.sessionId === sessionId) || null;
  },

  listLiveMessages(sessionId: string): LiveAgentChatMessage[] {
    const store = readStore();
    ensureLiveSessionState(store);
    return store.liveMessages
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  },

  sendCustomerLiveMessage(sessionId: string, text: string): boolean {
    const store = readStore();
    ensureLiveSessionState(store);
    const updated = updateLiveSession(store, sessionId, (session) => {
      return isLiveSessionOpen(session.status) ? { ...session, lastActivityAt: nowIso() } : session;
    });
    if (!updated || !isLiveSessionOpen(updated.status)) {
      return false;
    }
    addLiveMessage(store, sessionId, "customer", text);
    writeStore(store);
    emitSupportUpdate();
    return true;
  },

  joinLiveSession(sessionId: string, agentName: string): boolean {
    const store = readStore();
    ensureLiveSessionState(store);
    const previous = store.liveSessions.find((session) => session.sessionId === sessionId);
    const updated = updateLiveSession(store, sessionId, (session) => {
      if (!isLiveSessionOpen(session.status)) {
        return session;
      }
      const status = session.status === "QUEUED" ? "IN_PROGRESS" : session.status;
      return { ...session, status, assignedAgentName: agentName.trim() || "Support Agent", lastActivityAt: nowIso() };
    });
    if (!updated || !isLiveSessionOpen(updated.status)) {
      return false;
    }
    if (previous?.status === "QUEUED" && updated.status === "IN_PROGRESS") {
      addLiveMessage(store, sessionId, "system", `${updated.assignedAgentName} joined the chat.`);
    }
    writeStore(store);
    emitSupportUpdate();
    return true;
  },

  sendAgentLiveMessage(sessionId: string, text: string, agentName: string): boolean {
    const store = readStore();
    ensureLiveSessionState(store);
    const updated = updateLiveSession(store, sessionId, (session) => {
      return isLiveSessionOpen(session.status)
        ? { ...session, status: "IN_PROGRESS", assignedAgentName: agentName.trim() || "Support Agent", lastActivityAt: nowIso() }
        : session;
    });
    if (!updated || !isLiveSessionOpen(updated.status)) {
      return false;
    }
    addLiveMessage(store, sessionId, "agent", text);
    writeStore(store);
    emitSupportUpdate();
    return true;
  },

  endLiveSession(sessionId: string, endedBy: LiveChatEndedBy, note?: string): boolean {
    const store = readStore();
    ensureLiveSessionState(store);
    const session = store.liveSessions.find((entry) => entry.sessionId === sessionId);
    if (!session || !isLiveSessionOpen(session.status)) {
      return false;
    }
    const updated = updateLiveSession(store, sessionId, (session) => {
      const closedAt = nowIso();
      return { ...session, status: "ENDED", endedAt: closedAt, endedBy, lastActivityAt: closedAt };
    });
    if (!updated) {
      return false;
    }
    addLiveMessage(store, sessionId, "system", note || `Chat ended by ${endedBy}.`);
    writeStore(store);
    emitSupportUpdate();
    return true;
  },

  autoCloseIdleSessions(idleMinutes = LIVE_CHAT_IDLE_MINUTES): number {
    const store = readStore();
    const closedCount = closeIdleLiveSessions(store, idleMinutes);
    if (closedCount > 0) {
      writeStore(store);
      emitSupportUpdate();
    }
    return closedCount;
  },

  async submitMessage(payload: ContactMessageRequest): Promise<ContactMessageReceipt> {
    await delay(350);
    const receipt: ContactMessageReceipt = {
      reference: createReference("MSG"),
      status: "RECEIVED",
      createdAt: nowIso(),
    };
    const store = readStore();
    store.messages.unshift({ ...payload, ...receipt });
    writeStore(store);
    emitSupportUpdate();
    return receipt;
  },
};
