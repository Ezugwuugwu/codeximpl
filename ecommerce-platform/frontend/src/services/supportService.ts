import axios from "axios";
import type {
  ContactMessageReceipt,
  ContactMessageRequest,
  LiveAgentChatMessage,
  LiveAgentRequest,
  LiveAgentSession,
  LiveAgentTicket,
  LiveChatEndedBy,
  VirtualChatMessage,
} from "../types/support";

// ---- Auth helper ----

const authHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ---- Virtual agent (client-side, no backend) ----

const getVirtualReply = (input: string): string => {
  const text = input.toLowerCase();
  if (/refund|return|money back/.test(text))
    return "For refunds/returns, open your order from Cart > history and choose Return Request. I can also connect you to a live agent.";
  if (/track|where.*order|delivery status/.test(text))
    return "To track an order, go to Admin > Orders Placed (or your order history), then check latest status updates there.";
  if (/payment|charged|card/.test(text))
    return "For payment issues, verify card details and retry once. If still failing, I can escalate this to a live payment support agent.";
  if (/live|human|agent/.test(text))
    return "You can switch to the Live Agent tab now and raise a ticket. We will queue you immediately.";
  return "I can help with order tracking, refunds, payment issues, deliveries, and product questions. Tell me what happened.";
};

// ---- Admin read-state (client-side localStorage) ----

const adminReadStateKey = "okanga_admin_read_state_v1";

const readAdminReadState = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(adminReadStateKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeAdminReadState = (state: Record<string, string>) => {
  localStorage.setItem(adminReadStateKey, JSON.stringify(state));
};

// ---- Contact message store (client-side localStorage) ----

type ContactStore = {
  messages: Array<ContactMessageReceipt & ContactMessageRequest>;
};
const contactStoreKey = "okanga_contact_messages_v1";
const nowIso = () => new Date().toISOString();
const supportBroadcastChannelName = "okanga_support";
const isOpenLiveStatus = (status?: LiveAgentSession["status"]) => status === "QUEUED" || status === "IN_PROGRESS";

const readContactStore = (): ContactStore => {
  try {
    const raw = localStorage.getItem(contactStoreKey);
    return raw ? (JSON.parse(raw) as ContactStore) : { messages: [] };
  } catch {
    return { messages: [] };
  }
};

const createMsgRef = () => {
  const seed = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  return `MSG-${seed.slice(-10).toUpperCase()}`;
};

const emitSupportStoreUpdated = () => {
  window.dispatchEvent(new Event("support:store-updated"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(supportBroadcastChannelName);
    channel.postMessage({ type: "store-updated", at: nowIso() });
    channel.close();
  }
};

// ---- API base ----

const API = "/api/v1/support/sessions";

// ---- Service ----

export const supportService = {
  // Virtual agent reply (no server call)
  async sendVirtualMessage(input: string): Promise<VirtualChatMessage> {
    await new Promise((r) => setTimeout(r, 300));
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: "agent",
      text: getVirtualReply(input),
      createdAt: nowIso(),
    };
  },

  // Create a new live-agent session
  async requestLiveAgent(payload: LiveAgentRequest): Promise<LiveAgentTicket> {
    const { data } = await axios.post<LiveAgentSession>(
      API,
      {
        name: payload.name,
        email: payload.email,
        issue: payload.issue,
        orderId: payload.orderId || null,
        preferredContact: payload.preferredContact,
      },
      { headers: authHeaders() }
    );
    emitSupportStoreUpdated();
    return {
      sessionId: data.sessionId,
      ticketId: data.ticketId,
      status: "QUEUED",
      estimatedWaitMinutes: data.estimatedWaitMinutes,
      assignedQueue: data.assignedQueue,
      createdAt: data.createdAt,
    };
  },

  // List all sessions — server auto-closes idle ones
  async listLiveSessions(): Promise<LiveAgentSession[]> {
    const { data } = await axios.get<LiveAgentSession[]>(API, {
      headers: authHeaders(),
    });
    return data;
  },

  // Get one session (customer polling)
  async getLiveSession(sessionId: string): Promise<LiveAgentSession | null> {
    try {
      const { data } = await axios.get<LiveAgentSession>(`${API}/${sessionId}`, {
        headers: authHeaders(),
      });
      return data;
    } catch {
      return null;
    }
  },

  // Messages for a session
  async listLiveMessages(sessionId: string): Promise<LiveAgentChatMessage[]> {
    const { data } = await axios.get<LiveAgentChatMessage[]>(`${API}/${sessionId}/messages`, {
      headers: authHeaders(),
    });
    return data;
  },

  // Customer sends a message
  async sendCustomerLiveMessage(sessionId: string, text: string): Promise<boolean> {
    try {
      await axios.post(
        `${API}/${sessionId}/messages`,
        { author: "customer", text },
        { headers: authHeaders() }
      );
      emitSupportStoreUpdated();
      return true;
    } catch {
      return false;
    }
  },

  // Agent joins a queued session
  async joinLiveSession(sessionId: string, agentName: string): Promise<boolean> {
    try {
      await axios.post(
        `${API}/${sessionId}/join`,
        { agentName },
        { headers: authHeaders() }
      );
      emitSupportStoreUpdated();
      return true;
    } catch {
      return false;
    }
  },

  // Agent sends a reply
  async sendAgentLiveMessage(sessionId: string, text: string, agentName: string): Promise<boolean> {
    try {
      await axios.post(
        `${API}/${sessionId}/messages`,
        { author: "agent", text, senderName: agentName },
        { headers: authHeaders() }
      );
      emitSupportStoreUpdated();
      return true;
    } catch {
      return false;
    }
  },

  // End a session
  async endLiveSession(sessionId: string, endedBy: LiveChatEndedBy, note?: string): Promise<boolean> {
    try {
      await axios.post(
        `${API}/${sessionId}/end`,
        { endedBy, reason: note || "Chat ended." },
        { headers: authHeaders() }
      );
      emitSupportStoreUpdated();
      return true;
    } catch {
      return false;
    }
  },

  // Clear all sessions (admin)
  async clearAllLiveSessions(): Promise<void> {
    await axios.delete(API, { headers: authHeaders() });
    emitSupportStoreUpdated();
  },

  // No-op: server handles idle-close on every listLiveSessions call
  async autoCloseIdleSessions(): Promise<void> {
    // handled server-side
  },

  // Unread count: compares session lastActivityAt vs admin read timestamps
  getUnreadSessionCount(sessions: LiveAgentSession[]): number {
    const readState = readAdminReadState();
    let count = 0;
    for (const session of sessions) {
      if (session.status !== "QUEUED" && session.status !== "IN_PROGRESS") continue;
      const lastReadAt = readState[session.sessionId];
      if (!lastReadAt || Date.parse(session.lastActivityAt) > Date.parse(lastReadAt)) {
        count++;
      }
    }
    return count;
  },

  markSessionRead(sessionId: string): void {
    const state = readAdminReadState();
    state[sessionId] = nowIso();
    writeAdminReadState(state);
  },

  listContactMessages(): Array<ContactMessageReceipt & ContactMessageRequest> {
    return readContactStore().messages;
  },

  getSupportNotificationCount(params: {
    sessions?: LiveAgentSession[];
    isAdmin: boolean;
    userEmail?: string | null;
  }): number {
    const normalizedEmail = params.userEmail?.trim().toLowerCase() || "";
    const sessions = params.sessions ?? [];
    const liveCount = sessions.filter((session) => {
      if (!isOpenLiveStatus(session.status)) {
        return false;
      }
      if (params.isAdmin) {
        return true;
      }
      if (!normalizedEmail) {
        return false;
      }
      return (session.email || "").trim().toLowerCase() === normalizedEmail;
    }).length;

    const messages = readContactStore().messages;
    const messageCount = params.isAdmin
      ? messages.length
      : normalizedEmail
        ? messages.filter((message) => (message.email || "").trim().toLowerCase() === normalizedEmail).length
        : messages.length;

    return liveCount + messageCount;
  },

  // Contact/message form (client-side only)
  async submitMessage(payload: ContactMessageRequest): Promise<ContactMessageReceipt> {
    await new Promise((r) => setTimeout(r, 350));
    const receipt: ContactMessageReceipt = {
      reference: createMsgRef(),
      status: "RECEIVED",
      createdAt: nowIso(),
    };
    const store = readContactStore();
    store.messages.unshift({ ...payload, ...receipt });
    localStorage.setItem(contactStoreKey, JSON.stringify(store));
    emitSupportStoreUpdated();
    return receipt;
  },
};
