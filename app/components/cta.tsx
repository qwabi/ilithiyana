import Link from "next/link"
import { AnimatedButton } from "./ui/animated-button"

export function CTA() {
  return (
    <section className="bg-accent py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Future?</h2>
        <p className="text-xl text-white/90 mb-8">Join Ilithiyana Group and be part of South Africa's growth story.</p>
        <AnimatedButton asChild size="lg">
          <Link href="/contact">Get Started Today</Link>
        </AnimatedButton>
      </div>
    </section>
  )
}

