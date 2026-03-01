import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState<SupportChannel>("virtual");
  const supportPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const channel = searchParams.get("channel");
    if (channel === "virtual" || channel === "live" || channel === "message") {
      setActive(channel);
      window.requestAnimationFrame(() => {
        supportPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    if (window.location.hash === "#support-panel") {
      window.requestAnimationFrame(() => {
        supportPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [searchParams]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#c8d5e6] bg-gradient-to-br from-[#f6f9fd] via-[#edf3fa] to-[#e7eef8] p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3d5a80]">Customer Support Center</p>
        <h2 className="mt-2 text-4xl font-bold leading-tight text-[#0f1b34]">Contact Okanga Mart</h2>
        <p className="mt-3 max-w-3xl text-xl leading-relaxed text-[#334a68]">Choose virtual chat, request a live agent, or send a support message.</p>
        <div className="mt-5 grid gap-2 rounded-xl border border-[#c8d5e6] bg-white/75 p-4 text-base font-medium text-[#22324d] md:grid-cols-3">
          <p><span className="font-bold">Email:</span> support@okangamart.com</p>
          <p><span className="font-bold">Phone:</span> +1 (800) 555-0199</p>
          <p><span className="font-bold">Hours:</span> Mon-Sat, 8AM-8PM</p>
        </div>
      </header>

      <SupportTabs active={active} onSelect={setActive} />
      <div className="scroll-mt-28" id="support-panel" ref={supportPanelRef}>
        {renderPanel(active)}
      </div>
    </section>
  );
}

export default ContactPage;
