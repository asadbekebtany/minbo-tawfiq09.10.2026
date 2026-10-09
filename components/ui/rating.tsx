import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Rating({ value, count, size = "sm", className }: RatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const sizeCls = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {stars.map((star) => (
          <svg
            key={star}
            className={cn(
              sizeCls[size],
              star <= Math.round(value) ? "text-yellow-400" : "text-gray-300"
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ width: "1em", height: "1em" }}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {count !== undefined && (
        <span className={cn("text-gray-500", sizeCls[size])}>({count})</span>
      )}
    </div>
  );
}
