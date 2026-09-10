"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface PillBadgeProps {
  children: React.ReactNode;
  showArrow?: boolean;
  className?: string;
}

export function PillBadge({ 
  children, 
  showArrow = true,
  className 
}: PillBadgeProps) {
  return (
    <div className={cn(
      "text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2",
      "bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent",
      "dark:from-zinc-300/5 dark:via-gray-400/5",
      "border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit",
      "flex items-center gap-1 max-w-full text-center whitespace-normal sm:whitespace-nowrap",
      className
    )}>
      <span>{children}</span>
      {showArrow && (
        <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 duration-300" />
      )}
    </div>
  );
}