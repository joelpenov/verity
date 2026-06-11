interface Props {
  className?: string;
  height?: number | string;
  width?: number | string;
  lines?: number;
}

export default function Skeleton({ className = "", height, width, lines = 1 }: Props) {
  if (lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="shimmer"
            style={{ height: 14, width: i === lines - 1 ? "65%" : "100%" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`shimmer ${className}`}
      style={{ height: height ?? 16, width: width ?? "100%" }}
    />
  );
}
