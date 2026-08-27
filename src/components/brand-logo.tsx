import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = { className?: string; compact?: boolean; inverted?: boolean };

export function BrandLogo({ className, compact = false, inverted = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative shrink-0 overflow-hidden", compact ? "h-10 w-12" : "h-12 w-16")}>
        <Image src="/brand/logo-trainings-pro-official.png" alt="Trainings PRO" fill priority sizes="64px" className="scale-[1.45] object-contain object-left" />
      </div>
      <div className={cn("leading-none", compact && "hidden sm:block")}><span className={cn("block text-base font-bold tracking-tight", inverted ? "text-white" : "text-[#06113B]")}>Trainings PRO</span><span className={cn("mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em]", inverted ? "text-cyan-200" : "text-slate-500")}>NICPMS Academy</span></div>
    </div>
  );
}
