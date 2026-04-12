import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    critical: "border-destructive/30 bg-destructive/10 text-destructive",
    high: "border-[color:var(--color-amber)]/30 bg-[color:var(--color-amber)]/10 text-[color:var(--color-amber)]",
    medium: "border-[color:var(--color-amber)]/20 bg-[color:var(--color-amber)]/5 text-[color:var(--color-amber)]/80",
    low: "border-primary/30 bg-primary/10 text-primary",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  }

  return (
    <div className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-display uppercase tracking-wider", variants[variant], className)} {...props} />
  )
}

export { Badge }
