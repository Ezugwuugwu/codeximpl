export type SupportChannel = "virtual" | "live" | "message";

export type VirtualChatMessage = {
  id: string;
  author: "customer" | "agent";
  text: string;
  createdAt: string;
};

export type LiveAgentRequest = {
  name: string;
  email: string;
  orderId?: string;
  issue: string;
  preferredContact: "email" | "phone";
};

export type LiveChatAuthor = "customer" | "agent" | "system";

export type LiveChatStatus = "QUEUED" | "IN_PROGRESS" | "ENDED" | "TIMED_OUT";

export type LiveChatEndedBy = "customer" | "agent" | "system";

export type LiveAgentTicket = {
  sessionId: string;
  ticketId: string;
  status: "QUEUED";
  estimatedWaitMinutes: number;
  assignedQueue: string;
  createdAt: string;
};

export type LiveAgentSession = {
  sessionId: string;
  ticketId: string;
  name: string;
  email: string;
  orderId?: string;
  preferredContact: "email" | "phone";
  assignedQueue: string;
  status: LiveChatStatus;
  estimatedWaitMinutes: number;
  createdAt: string;
  lastActivityAt: string;
  endedAt?: string;
  endedBy?: LiveChatEndedBy;
  assignedAgentName?: string;
};

export type LiveAgentChatMessage = {
  id: string;
  sessionId: string;
  author: LiveChatAuthor;
  senderName?: string;
  text: string;
  createdAt: string;
};

export type ContactMessageRequest = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactMessageReceipt = {
  reference: string;
  status: "RECEIVED";
  createdAt: string;
};
