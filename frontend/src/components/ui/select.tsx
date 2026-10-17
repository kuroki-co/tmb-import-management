import type { ComponentPropsWithRef } from "react";
import { inputClass } from "./field";

export function Select({
  className = "",
  ...props
}: ComponentPropsWithRef<"select">) {
  return <select {...props} className={`${inputClass} tmb-select ${className}`} />;
}
