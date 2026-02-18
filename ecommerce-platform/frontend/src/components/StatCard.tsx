type Props = {
  label: string;
  value: string;
};

function StatCard({ label, value }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default StatCard;
