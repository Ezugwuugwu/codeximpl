import { useState } from "react";
import LiveAgentPanel from "../components/contact/LiveAgentPanel";
import MessagePanel from "../components/contact/MessagePanel";
import SupportTabs from "../components/contact/SupportTabs";
import VirtualAgentPanel from "../components/contact/VirtualAgentPanel";
import type { SupportChannel } from "../types/support";

const renderPanel = (channel: SupportChannel) => {
  if (channel === "live") {
    return <LiveAgentPanel />;
  }
  if (channel === "message") {
    return <MessagePanel />;
  }
  return <VirtualAgentPanel />;
};

function ContactPage() {
  const [active, setActive] = useState<SupportChannel>("virtual");

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Customer Support Center</p>
        <h2 className="mt-1 text-2xl font-semibold">Contact Okanga Mart</h2>
        <p className="mt-2 text-sm text-slate-600">Choose virtual chat, request a live agent, or send a support message.</p>
        <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-3">
          <p><span className="font-semibold">Email:</span> support@okangamart.com</p>
          <p><span className="font-semibold">Phone:</span> +1 (800) 555-0199</p>
          <p><span className="font-semibold">Hours:</span> Mon-Sat, 8AM-8PM</p>
        </div>
      </header>

      <SupportTabs active={active} onSelect={setActive} />
      {renderPanel(active)}
    </section>
  );
}

export default ContactPage;
