type Props = {
  rating: number;
  reviewCount: number;
  compact?: boolean;
  className?: string;
};

function RatingDisplay({ rating, reviewCount, compact = false, className = "" }: Props) {
  const fullStars = Math.round(rating);
  const starSizeClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const textClass = compact ? "text-xs" : "text-sm";

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <svg
            key={index}
            aria-hidden="true"
            className={`${starSizeClass} ${index < fullStars ? "text-yellow-400" : "text-slate-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 1.25l2.626 5.322 5.874.854-4.25 4.142 1.003 5.848L10 14.654l-5.253 2.762 1.003-5.848L1.5 7.426l5.874-.854L10 1.25z" />
          </svg>
        ))}
      </div>
      <span className={`font-semibold text-yellow-500 ${textClass}`}>{rating.toFixed(1)}</span>
      <span className={`${textClass} text-slate-500`}>({reviewCount} reviews)</span>
    </div>
  );
}

export default RatingDisplay;
