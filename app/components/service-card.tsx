"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TypeIcon as type, type LucideIcon } from "lucide-react"
import Image from "next/image"
import { useInView } from "react-intersection-observer"

interface ServiceCardProps {
  title: string
  description: string
  icon: LucideIcon
  image: string
  className?: string
}

export function ServiceCard({ title, description, icon: Icon, image, className }: ServiceCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <Card
      ref={ref}
      className={cn(
        "group relative overflow-hidden transition-all duration-500",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        "hover:shadow-xl hover:scale-105",
        className,
      )}
    >
      <div className="absolute inset-0 z-0">
        <Image
          src={image || "/placeholder.svg"}
          alt={title}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      </div>
      <CardHeader className="relative z-10">
        <Icon className="w-12 h-12 text-secondary mb-2 animate-float" />
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <CardDescription className="text-white/90">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

