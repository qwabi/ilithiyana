"use client"

import type * as React from "react"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  children: React.ReactNode
  asChild?: boolean
}

export function AnimatedButton({
  className,
  variant = "default",
  size = "default",
  children,
  asChild = false,
  ...props
}: AnimatedButtonProps) {
  return (
    <Button
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "bg-primary text-white hover:bg-primary/90",
        "hover:shadow-lg hover:shadow-primary/20 hover:scale-105",
        "after:absolute after:inset-0 after:z-[-1]",
        "after:bg-gradient-to-r after:from-primary/20 after:via-accent/20 after:to-secondary/20",
        "after:transition-transform after:duration-300",
        "after:hover:scale-150 after:hover:rotate-12",
        className,
      )}
      variant={variant}
      size={size}
      asChild={asChild}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </Button>
  )
}

