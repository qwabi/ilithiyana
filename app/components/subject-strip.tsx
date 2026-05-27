'use client';

import { motion } from 'framer-motion';
import { Calculator, FlaskConical, Leaf, Languages, Atom, type LucideIcon } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { StaggerChildren, StaggerItem } from '@/components/ui/StaggerChildren';
import { grades } from '@/lib/site-config';

type SubjectCard = {
  name: string;
  Icon: LucideIcon;
  bg: string;
  text: string;
  grades: string;
};

const subjectCards: SubjectCard[] = [
  { name: 'Pure Maths',       Icon: Calculator,  bg: 'bg-primary',      text: 'text-white',                     grades: 'Grades 6–12' },
  { name: 'Physical Science', Icon: Atom,        bg: 'bg-accent',       text: 'text-white',                     grades: 'Grades 10–12' },
  { name: 'Life Sciences',    Icon: Leaf,        bg: 'bg-light-blue',   text: 'text-primary-dark',              grades: 'Grades 10–12' },
  { name: 'English',          Icon: Languages,   bg: 'bg-secondary',    text: 'text-secondary-foreground',      grades: 'Grades 6–12' },
  { name: 'Natural Sciences', Icon: FlaskConical,bg: 'bg-primary/80',   text: 'text-white',                     grades: 'Grades 6–9' },
];

export function SubjectStrip() {
  const gradeRange = `Grades ${grades[0]}–${grades[grades.length - 1]}`;

  return (
    <section className='overflow-hidden bg-primary-light py-20 font-sans'>
      <div className='container mx-auto px-4'>
        <ScrollReveal className='mb-10'>
          <p className='overline mb-2 text-primary'>What we teach</p>
          <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
            5 subjects.{' '}
            <em className='not-italic text-secondary'>Every grade.</em>
          </h2>
          <p className='mt-2 text-muted-foreground'>
            {gradeRange} — specialist support in the subjects learners need most.
          </p>
        </ScrollReveal>

        <StaggerChildren className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0'>
          {subjectCards.map(({ name, Icon, bg, text, grades: g }) => (
            <StaggerItem
              key={name}
              className='min-w-[160px] flex-shrink-0 snap-start md:min-w-0'
            >
              <motion.div
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className={`flex h-full flex-col gap-3 rounded-2xl p-5 ${bg}`}
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white/20'>
                  <Icon className={`h-6 w-6 ${text}`} aria-hidden />
                </div>
                <p className={`text-base font-bold leading-tight ${text}`}>{name}</p>
                <p className={`text-xs font-medium ${text} opacity-75`}>{g}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
