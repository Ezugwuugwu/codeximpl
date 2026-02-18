import { Link } from "react-router-dom";

type FooterLink = {
  label: string;
  to: string;
  bold?: boolean;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const footerColumns: FooterColumn[] = [
  {
    title: "About Okanga Mart",
    links: [
      { label: "Who We Are", to: "/" },
      { label: "Community Promise", to: "/" },
      { label: "Product Quality Standards", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Partnerships", to: "/" },
    ],
  },
  {
    title: "Sell & Grow",
    links: [
      { label: "Become a Seller", to: "/admin" },
      { label: "Product Promotions", to: "/admin" },
      { label: "Inventory Tips", to: "/admin" },
      { label: "Analytics Dashboard", to: "/admin" },
      { label: "Business Support", to: "/contact" },
    ],
  },
  {
    title: "Customer Account",
    links: [
      { label: "Sign In", to: "/login" },
      { label: "Your Cart", to: "/cart" },
      { label: "Track Orders", to: "/admin" },
      { label: "Returns & Refunds", to: "/contact" },
      { label: "Help Center", to: "/contact" },
    ],
  },
  {
    title: "Support & Contact",
    links: [
      { label: "Contact", to: "/contact", bold: true },
      { label: "Virtual Agent", to: "/contact" },
      { label: "Live Agent", to: "/contact" },
      { label: "Send Message", to: "/contact" },
      { label: "Safety & Policy", to: "/contact" },
    ],
  },
];

function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-700/70 bg-gradient-to-b from-[#23354d] via-[#1e2f45] to-[#17263a] text-slate-200">
      <div className="border-b border-slate-600/70 bg-[#32445d]">
        <button
          className="w-full px-6 py-4 text-center text-sm font-semibold tracking-[0.04em] text-slate-100 transition hover:bg-[#3a4f6b]"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          Back to top
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {footerColumns.map((column) => (
          <section className="space-y-3" key={column.title}>
            <h3 className="text-xl font-semibold text-white">{column.title}</h3>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link
                    className={`transition hover:text-white ${link.bold ? "font-bold text-white" : "text-slate-200"}`}
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-slate-600/70 px-6 py-4 text-center text-xs text-slate-300">
        Okanga Mart © {new Date().getFullYear()} • Trusted marketplace for fashion, audio, and smart lifestyle products.
      </div>
    </footer>
  );
}

export default SiteFooter;
