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
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            active === option.id ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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
