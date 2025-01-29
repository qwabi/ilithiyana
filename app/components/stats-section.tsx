"use client"

import { useInView } from "react-intersection-observer"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
}

function AnimatedStat({ value, label, prefix = "", suffix = "" }: StatProps) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    if (inView) {
      const start = 0
      const end = Number.parseInt(value.toString(), 10)
      const duration = 2000
      let startTimestamp: number | null = null

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp
        const progress = Math.min((timestamp - startTimestamp) / duration, 1)
        setCount(Math.floor(progress * (end - start) + start))
        if (progress < 1) {
          window.requestAnimationFrame(step)
        }
      }

      window.requestAnimationFrame(step)
    }
  }, [inView, value])

  return (
    <Card ref={ref} className="text-center animate-fade-in">
      <CardHeader>
        <CardTitle className="text-4xl font-bold text-primary">
          {prefix}
          {count}
          {suffix}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

export function StatsSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">Our Impact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatedStat value={5000} label="Students Tutored" suffix="+" />
          <AnimatedStat value={100} label="Fleet Clients" suffix="+" />
          <AnimatedStat value={50} label="Infrastructure Projects" suffix="+" />
          <AnimatedStat value={95} label="Client Satisfaction" suffix="%" />
        </div>
      </div>
    </section>
  )
}

