export default function StarRating({ rating = 0, size = 13, showNumber = false, count }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {stars.map((s) => {
          const fill = rating >= s ? 1 : rating > s - 1 ? rating - (s - 1) : 0;
          return (
            <span key={s} className="relative inline-block" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox="0 0 20 20" className="absolute inset-0">
                <path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.7l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L10 1.5Z" fill="#E7E7E3" />
              </svg>
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg width={size} height={size} viewBox="0 0 20 20">
                  <path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.7l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L10 1.5Z" fill="#D8BE93" />
                </svg>
              </span>
            </span>
          );
        })}
      </span>
      {showNumber && rating > 0 && (
        <span className="text-xs font-semibold text-ink-soft">{rating.toFixed(1)}{count !== undefined && ` (${count})`}</span>
      )}
    </span>
  );
}
