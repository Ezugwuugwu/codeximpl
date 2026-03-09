import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

type AboutSectionId =
  | "who-we-are"
  | "community-promise"
  | "product-quality-standards"
  | "careers"
  | "partnerships";

type AboutSection = {
  id: AboutSectionId;
  navLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  body: string[];
  accent: string;
};

function SectionIcon({ id }: { id: AboutSectionId }) {
  switch (id) {
    case "who-we-are":
      return (
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 3v18" />
          <path d="M5 8c0-2.8 3.1-5 7-5s7 2.2 7 5-3.1 5-7 5-7 2.2-7 5" />
        </svg>
      );
    case "community-promise":
      return (
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 21s-7-4.4-7-10.4A4.6 4.6 0 0 1 9.6 6c1 0 1.9.3 2.4.9.5-.6 1.4-.9 2.4-.9A4.6 4.6 0 0 1 19 10.6C19 16.6 12 21 12 21Z" />
        </svg>
      );
    case "product-quality-standards":
      return (
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 3 4 7v5c0 5.4 3.4 8.5 8 10 4.6-1.5 8-4.6 8-10V7l-8-4Z" />
          <path d="m9.5 12 1.7 1.7L15.5 9.5" />
        </svg>
      );
    case "careers":
      return (
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M6 20h12" />
          <path d="M8 20V10l4-3 4 3v10" />
          <path d="M9 10V6h6v4" />
        </svg>
      );
    case "partnerships":
      return (
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="m8 12 3 3 5-5" />
          <path d="M7 4h5l1 2h4a1 1 0 0 1 1 1v2.3a4.9 4.9 0 0 0-3.3 1.4l-2 2a4.9 4.9 0 0 1-6.9 0L4 11.9V7a1 1 0 0 1 1-1h1l1-2Z" />
          <path d="M15.6 13.4 20 17.8" />
        </svg>
      );
  }
}

const sections: AboutSection[] = [
  {
    id: "who-we-are",
    navLabel: "Who We Are",
    eyebrow: "Working Theory",
    title: "A live lab for better online shopping.",
    summary: "Okanga Mart is where we ship, test, and refine e-commerce ideas in public.",
    body: [
      "This platform is a practical lab experiment for improving online shopping, starting with dependable fundamentals and moving toward more ambitious features as they prove useful.",
      "We use it to learn what actually helps buyers and sellers: cleaner flows, stronger reliability, sharper product discovery, and smarter operational tools.",
      "Until the right moment arrives to pursue something larger, Okanga Mart is the space where those ideas are built, measured, and improved release by release.",
    ],
    accent: "from-[#fff0b3] via-[#fff7d1] to-white",
  },
  {
    id: "community-promise",
    navLabel: "Community Promise",
    eyebrow: "Shared Standard",
    title: "Trust should feel visible, not assumed.",
    summary: "We want the platform to be clear, respectful, and useful for the people who rely on it.",
    body: [
      "Our promise is simple: clear pricing, honest product presentation, responsive support, and product decisions that favor long-term trust over short-term tricks.",
      "We will keep listening to real usage, fix friction when we find it, and avoid dark patterns that make commerce feel manipulative or confusing.",
      "If the community gives feedback, the product should change for the better. That is the standard we want to hold ourselves to.",
    ],
    accent: "from-[#dff6ec] via-[#f3fff9] to-white",
  },
  {
    id: "product-quality-standards",
    navLabel: "Product Quality Standards",
    eyebrow: "Engineering Discipline",
    title: "Quality means code, product, and experience moving together.",
    summary: "We want every feature to be maintainable, understandable, and reliable after launch.",
    body: [
      "Okanga Mart is built with the expectation that features should survive real usage, not just demos. That means stable architecture, observable systems, careful rollout, and fast correction when something weak is exposed.",
      "We aim to follow strong engineering standards in implementation, testing, integration boundaries, and operational safety so new work does not make the rest of the system harder to trust or maintain.",
      "Product quality here is not only visual polish. It includes readable UX, loose coupling, consistent behavior, security-minded decisions, and a willingness to improve rough edges quickly.",
    ],
    accent: "from-[#e4ecff] via-[#f6f8ff] to-white",
  },
  {
    id: "careers",
    navLabel: "Careers",
    eyebrow: "Direction Of Travel",
    title: "From dependable commerce basics to AI-assisted systems.",
    summary: "The long track is to build from core store features toward smarter tools that genuinely improve shopping.",
    body: [
      "The direction is intentional: start with solid e-commerce basics, then grow into AI-powered and more inventive solutions that improve discovery, confidence, speed, and post-purchase clarity.",
      "We are interested in people who respect fundamentals and still want to push commerce forward with better systems, sharper workflows, and practical innovation.",
      "Especially in Nigeria, there is room to improve online shopping with products that are both more ambitious and more grounded in real constraints. That is the path we care about.",
    ],
    accent: "from-[#f3e8ff] via-[#faf3ff] to-white",
  },
  {
    id: "partnerships",
    navLabel: "Partnerships",
    eyebrow: "Build Together",
    title: "Bring the unusual idea, if it can make shopping better.",
    summary: "We want thoughtful partnerships around ideas that can improve e-commerce in Nigeria.",
    body: [
      "If you are building something unusual but high-quality that could improve online shopping, commerce operations, or customer trust in Nigeria, we want to hear it.",
      "That might be a product idea, logistics workflow, AI assistant, payments concept, merchandising tool, or a focused experiment that deserves a real proving ground.",
      "Reach out at support@okangamart.com. The best partnership conversations usually start with a specific problem worth solving well.",
    ],
    accent: "from-[#ffe7d6] via-[#fff4ea] to-white",
  },
];

function AboutPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSectionId = useMemo<AboutSectionId>(() => {
    const requested = searchParams.get("section");
    const matched = sections.find((section) => section.id === requested);
    return matched?.id ?? "who-we-are";
  }, [searchParams]);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  const openSection = (sectionId: AboutSectionId) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", sectionId);
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_left,_rgba(245,201,85,0.22),_transparent_38%),linear-gradient(135deg,_#f8fbff_0%,_#eef7fb_42%,_#ffffff_100%)] px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.38em] text-slate-500">About Okanga Mart</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                A sharper story for the product we are building.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                These panels explain the thinking behind Okanga Mart: what it is, what it promises, how it approaches
                quality, where it wants to grow, and who it wants to build with.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                to="/"
              >
                Back to store
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                to="/contact"
              >
                Contact support
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:grid-cols-3 lg:grid-cols-1">
            {sections.map((section) => {
              const isActive = section.id === activeSection.id;
              return (
                <button
                  className={`group rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  key={section.id}
                  onClick={() => openSection(section.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isActive ? "bg-white/12 text-[#f5c955]" : "bg-[#fff4c8] text-slate-900"}`}>
                      <SectionIcon id={section.id} />
                    </div>
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        isActive
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 group-hover:text-slate-900"
                      }`}
                    >
                      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <h2 className={`text-lg font-bold ${isActive ? "text-white" : "text-slate-950"}`}>{section.navLabel}</h2>
                    <p className={`text-sm leading-6 ${isActive ? "text-slate-200" : "text-slate-500"}`}>{section.summary}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br ${activeSection.accent} shadow-[0_26px_80px_rgba(15,23,42,0.08)]`}>
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[260px_1fr] lg:px-10">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-slate-300/80 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              {activeSection.eyebrow}
            </span>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-950 text-[#f5c955] shadow-lg">
              <SectionIcon id={activeSection.id} />
            </div>
            <p className="max-w-[18rem] text-sm leading-7 text-slate-600">
              Open another topic from the overview cards above to switch the panel without leaving this page.
            </p>
          </div>

          <div className="space-y-6 rounded-[1.75rem] border border-white/70 bg-white/86 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">{activeSection.navLabel}</p>
              <h2 className="max-w-3xl text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">{activeSection.title}</h2>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">{activeSection.summary}</p>
            </div>

            <div className="grid gap-4">
              {activeSection.body.map((paragraph) => (
                <p className="text-base leading-8 text-slate-700" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>

            {activeSection.id === "partnerships" && (
              <div className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-950 px-5 py-4 text-white">
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5c955]">Start the conversation</p>
                  <p className="text-sm text-slate-200">Email support@okangamart.com if you have a focused idea worth testing.</p>
                </div>
                <a
                  className="inline-flex items-center justify-center rounded-full bg-[#f5c955] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#f1bc2f]"
                  href="mailto:support@okangamart.com"
                >
                  Email support
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
