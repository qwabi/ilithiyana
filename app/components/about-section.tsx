import Image from "next/image"
import { AnimatedButton } from "@/app/components/ui/animated-button"
import Link from "next/link"

export function AboutSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-primary animate-fade-in">About Ilithiyana</h2>
            <p className="text-lg text-gray-700 animate-slide-up">
              Ilithiyana Consulting is a 100% black-owned enterprise committed to contributing to South Africa's
              economic growth and community development. Founded by Masande Dudula, we specialize in Academics, Vehicle
              Care, Infrastructure Services, and Community Foundations.
            </p>
            <p className="text-lg text-gray-700 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              Our mission is to deliver excellence, create opportunities, and drive social impact across various sectors
              of the South African economy. We are guided by our core values of honesty, reliability, and integrity in
              every aspect of our operations.
            </p>
            <AnimatedButton asChild className="mt-4">
              <Link href="/about">Learn More About Us</Link>
            </AnimatedButton>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl animate-fade-in">
            <Image
              src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=2070"
              alt="Ilithiyana Team"
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

