import { ArrowUpRight } from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 ${light ? "text-white" : "text-navy"}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${light ? "bg-white/15" : "bg-primary text-white"}`}
      >
        <ArrowUpRight size={25} />
      </span>
      <div>
        <strong className="block text-xl tracking-[.12em]">TMB</strong>
        <span
          className={`block text-[9px] font-semibold tracking-[.16em] ${light ? "text-blue-200" : "text-muted"}`}
        >
          IMPORTACIONES
        </span>
      </div>
    </div>
  );
}
