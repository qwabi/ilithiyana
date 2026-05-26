"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  navLinks,
  onboardingStartPath,
  parentLoginPath,
  becomeTutorPath,
  tutorLoginPath,
} from "@/lib/site-config";

const navLinkClass =
  "nav-link-animated text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const primaryLinks = navLinks.filter(
    (link) => link.href !== onboardingStartPath,
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isParentLoginActive =
    pathname === parentLoginPath || pathname.startsWith("/dashboard");

  const isTutorLoginActive =
    pathname === tutorLoginPath || pathname.startsWith("/tutor");

  const isLoginActive = isParentLoginActive || isTutorLoginActive;

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 h-20 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 24 }}>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-xl leading-tight md:text-2xl">
                <span className="text-primary-dark">Ilithiyana</span>{" "}
                <span className="text-primary">Academics</span>
              </span>
            </Link>
          </motion.div>

          <div className="hidden items-center gap-8 md:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-active={isActive(link.href) ? "true" : undefined}
                className={cn(
                  navLinkClass,
                  isActive(link.href) && "font-semibold text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={becomeTutorPath}
              data-active={isActive(becomeTutorPath) ? "true" : undefined}
              className={cn(
                navLinkClass,
                isActive(becomeTutorPath) && "font-semibold text-primary",
              )}
            >
              Become a tutor
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                data-active={isLoginActive ? "true" : undefined}
                className={cn(
                  "nav-link-animated inline-flex items-center gap-1 outline-none",
                  navLinkClass,
                  isLoginActive && "font-semibold text-primary",
                )}
              >
                Log in
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[11rem]">
                <DropdownMenuItem asChild>
                  <Link
                    href={parentLoginPath}
                    className={cn(
                      "w-full cursor-pointer",
                      isParentLoginActive && "font-semibold text-primary",
                    )}
                  >
                    Parent / learner
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={tutorLoginPath}
                    className={cn(
                      "w-full cursor-pointer",
                      isTutorLoginActive && "font-semibold text-primary",
                    )}
                  >
                    Tutor
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Button
                asChild
                size="sm"
                className="rounded-full bg-secondary px-5 font-bold text-secondary-foreground shadow-none hover:bg-secondary/90"
              >
                <Link href={onboardingStartPath}>
                  <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-secondary-foreground/40" />
                  Apply now
                </Link>
              </Button>
            </motion.div>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 md:hidden hover:bg-muted"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-4 right-4 top-[calc(100%+8px)] rounded-2xl border border-border bg-white p-5 shadow-xl md:hidden"
            >
              <div className="flex flex-col gap-4">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-active={isActive(link.href) ? "true" : undefined}
                    className={cn(
                      navLinkClass + " text-base",
                      isActive(link.href) && "font-semibold text-primary",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href={becomeTutorPath}
                  className={cn(
                    "w-fit rounded-full bg-secondary px-4 py-2 text-base font-semibold text-secondary-foreground",
                    isActive(becomeTutorPath) && "ring-2 ring-secondary/40",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  Become a tutor
                </Link>
                <Link
                  href={parentLoginPath}
                  className={cn(
                    navLinkClass + " text-base",
                    isParentLoginActive && "font-semibold text-primary",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href={tutorLoginPath}
                  className={cn(
                    navLinkClass + " text-base",
                    isTutorLoginActive && "font-semibold text-primary",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  Tutor login
                </Link>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-fit"
                >
                  <Button
                    asChild
                    className="rounded-full bg-secondary px-6 font-bold text-secondary-foreground"
                  >
                    <Link
                      href={onboardingStartPath}
                      onClick={() => setIsOpen(false)}
                    >
                      Apply now
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
