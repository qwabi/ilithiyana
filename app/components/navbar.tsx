"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { AnimatedButton } from "@/app/components/ui/animated-button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20",
        isScrolled ? "bg-white shadow-md" : "bg-white/80 backdrop-blur-md",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/q0olcnl5-YJlKFxUCPpfToECyNu1zQ1s90wWQRT.png"
              alt="Ilithiyana Logo"
              width={180}
              height={60}
              className="h-12 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary">
              About
            </Link>
            <Link href="/academics" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary">
              Academics
            </Link>
            <Link
              href="/vehicle-care"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            >
              Vehicle Care
            </Link>
            <Link
              href="/infrastructure"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            >
              Infrastructure
            </Link>
            <AnimatedButton asChild size="sm">
              <Link href="/contact">Contact Us</Link>
            </AnimatedButton>
          </div>

          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="text-gray-600" /> : <Menu className="text-gray-600" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg p-4">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/academics"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Academics
              </Link>
              <Link
                href="/vehicle-care"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Vehicle Care
              </Link>
              <Link
                href="/infrastructure"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Infrastructure
              </Link>
              <AnimatedButton asChild size="sm" className="w-full">
                <Link href="/contact">Contact Us</Link>
              </AnimatedButton>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

