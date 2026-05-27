"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calculator,
  FlaskConical,
  Languages,
  GraduationCap,
  Wifi,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { onboardingStartPath } from "@/lib/site-config";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white font-sans pb-20 md:pb-28">
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary-light opacity-50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-secondary-light opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[40%] top-0 h-44 w-44 rounded-full bg-accent-light opacity-40"
        aria-hidden
      />

      <div className="container relative z-10 mx-auto grid min-h-[min(90vh,760px)] items-center gap-12 px-4 py-14 md:grid-cols-2 md:py-20">
        {/* ── Left: copy ── */}
        <div className="space-y-7">
          <motion.span
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent-dark">
              Applications open · Grades 6–12
            </span>
          </motion.span>

          <motion.h1
            {...fadeUp(0.08)}
            className="font-display text-[38px] leading-[1.08] text-primary-dark md:text-[54px]"
          >
            Your child deserves to{" "}
            <motion.em
              className="not-italic text-secondary inline-block"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              actually
            </motion.em>{" "}
            understand it.
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Small-group online tutoring for Grades 6–12 — max{" "}
            <strong className="font-semibold text-foreground">
              3 learners per tutor
            </strong>{" "}
            so every session counts. Pure Maths, Sciences and English with real
            subject specialists.
          </motion.p>

          <motion.div {...fadeUp(0.24)} className="flex flex-wrap gap-3 pt-1">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.32,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                asChild
                size="lg"
                className="rounded-full bg-secondary px-8 font-bold text-secondary-foreground shadow-lg hover:bg-secondary/90"
              >
                <Link href={onboardingStartPath}>
                  Apply now — from R175/lesson
                </Link>
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.4,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-2 border-primary px-8 text-primary hover:bg-primary-light"
              >
                <Link href="#how-it-works">How it works ↓</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            {...fadeUp(0.32)}
            className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm"
          >
            {["Open year-round", "Fully online", "Career guidance free"].map(
              (t) => (
                <span
                  key={t}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <span className="font-bold text-accent">✓</span>
                  {t}
                </span>
              ),
            )}
          </motion.div>
        </div>

        {/* ── Right: photo with floating badges ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 m-auto h-[90%] w-[90%] rounded-[2.5rem] bg-gradient-to-br from-primary-light via-secondary-light to-accent-light" />

          <div className="relative z-10 aspect-[4/3] w-full max-w-[500px] overflow-hidden rounded-[2rem] border-4 border-white shadow-2xl">
            <Image
              src="/student-raising-hand-at-teacher-and-other-student-at-the-board.jpg"
              alt="Tutor supporting a learner during an online lesson"
              fill
              className="object-cover"
              priority
              quality={80}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.55,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute -left-6 top-10 z-20 flex animate-float items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-2xl leading-none text-primary-dark">
                1:3
              </p>
              <p className="text-xs text-muted-foreground">max ratio</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -right-6 bottom-16 z-20 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-light">
              <Wifi className="h-5 w-5 text-accent-dark" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">100% Online</p>
              <p className="text-xs text-muted-foreground">any province</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.85,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute -bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 whitespace-nowrap"
          >
            {[
              { label: "Maths", bg: "bg-primary text-white", Icon: Calculator },
              {
                label: "Sciences",
                bg: "bg-accent text-white",
                Icon: FlaskConical,
              },
              {
                label: "English",
                bg: "bg-secondary text-secondary-foreground",
                Icon: Languages,
              },
            ].map(({ label, bg, Icon }, i) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.08, duration: 0.4 }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-lg ${bg}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </motion.span>
            ))}
          </motion.div>

          <Star
            className="absolute -top-3 right-12 h-7 w-7 animate-wiggle fill-secondary text-secondary"
            aria-hidden
          />
          <Star
            className="absolute bottom-28 -left-2 h-5 w-5 fill-accent text-accent"
            aria-hidden
          />
        </motion.div>
      </div>
    </section>
  );
}
