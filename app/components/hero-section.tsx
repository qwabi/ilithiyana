"use client"

import { useEffect, useState, useRef } from "react"
import { AnimatedButton } from "@/app/components/ui/animated-button"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

const taglines = [
  "Driving South Africa's Growth",
  "Empowering Communities",
  "Building a Brighter Future",
  "Excellence in Every Sector",
]

export function HeroSection() {
  const [scroll, setScroll] = useState(0)
  const [currentTagline, setCurrentTagline] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScroll(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)

    const taglineInterval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length)
    }, 3000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearInterval(taglineInterval)
    }
  }, [])

  return (
    <section className="relative h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 container mx-auto h-full flex flex-col justify-center items-center text-white text-center px-4"
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentTagline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
          >
            <span className="gradient-text">{taglines[currentTagline]}</span>
            <br />
            through Expertise & Integrity
          </motion.h1>
        </AnimatePresence>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl animate-slide-up opacity-90">
          Empowering communities through education, service excellence, and sustainable infrastructure development
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <AnimatedButton asChild size="lg" className="animate-float">
            <Link href="/academics">Explore Academics</Link>
          </AnimatedButton>
          <AnimatedButton
            asChild
            size="lg"
            variant="outline"
            className="animate-float bg-white text-primary hover:bg-primary hover:text-white"
            style={{ animationDelay: "0.2s" }}
          >
            <Link href="/vehicle-care">Book Fleet Services</Link>
          </AnimatedButton>
          <AnimatedButton
            asChild
            size="lg"
            variant="outline"
            className="animate-float bg-white text-primary hover:bg-primary hover:text-white"
            style={{ animationDelay: "0.4s" }}
          >
            <Link href="/infrastructure">Schedule Consultation</Link>
          </AnimatedButton>
        </div>
      </motion.div>
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&q=80&w=2874"
          alt="South African cityscape"
          layout="fill"
          objectFit="cover"
          quality={100}
          className="transform scale-110"
          style={{ transform: `scale(1.1) translateY(${scroll * 0.5}px)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/40" />
      </div>
    </section>
  )
}

