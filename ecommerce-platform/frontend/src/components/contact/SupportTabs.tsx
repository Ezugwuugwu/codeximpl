import type { SupportChannel } from "../../types/support";

type Props = {
  active: SupportChannel;
  onSelect: (channel: SupportChannel) => void;
};

const options: Array<{ id: SupportChannel; label: string }> = [
  { id: "virtual", label: "Virtual Agent" },
  { id: "live", label: "Live Agent" },
  { id: "message", label: "Send Message" },
];

function SupportTabs({ active, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-[#eef3f9] to-[#e8eff7] p-2 shadow-sm">
      {options.map((option) => (
        <button
          className={`rounded-full border px-5 py-2 text-base font-semibold tracking-[0.01em] transition ${
            active === option.id
              ? "border-[#1f3550] bg-[#1f3550] text-white shadow"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          key={option.id}
          onClick={() => onSelect(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SupportTabs;
