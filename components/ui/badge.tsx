import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "discount" | "new" | "hot" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
        {
          "bg-gray-100 text-gray-700": variant === "default",
          "bg-red-500 text-white": variant === "discount",
          "bg-green-500 text-white": variant === "new",
          "bg-orange-500 text-white": variant === "hot",
          "bg-emerald-100 text-emerald-700": variant === "success",
          "bg-yellow-100 text-yellow-700": variant === "warning",
          "bg-red-100 text-red-700": variant === "danger",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
