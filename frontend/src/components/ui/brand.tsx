import Image from "next/image";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`w-44 min-w-0 max-w-full sm:w-48 ${light ? "rounded-xl bg-white px-3 py-1.5 shadow-sm" : ""}`}>
      <Image
        src="/brand/tmb-logo.png"
        alt="TMB Importaciones EIRL · Global Mobility & Industrial Solutions"
        width={1765}
        height={891}
        sizes="192px"
        className="h-auto w-full"
      />
    </div>
  );
}
