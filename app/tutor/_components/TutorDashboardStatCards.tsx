'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MotionCard = motion.create(Card);

type StatCard = {
  label: string;
  value: string;
};

export function TutorDashboardStatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {stats.map((stat) => (
        <MotionCard
          key={stat.label}
          whileHover={{
            y: -2,
            boxShadow: '0 4px 16px rgba(0, 91, 184, 0.10)',
          }}
          transition={{ duration: 0.2 }}
        >
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold'>{stat.value}</p>
          </CardContent>
        </MotionCard>
      ))}
    </div>
  );
}
