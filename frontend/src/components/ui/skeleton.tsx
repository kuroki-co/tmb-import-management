import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={`block motion-safe:animate-pulse rounded-md bg-border/70 motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
}
