'use client';

import { motion } from 'framer-motion';

type StatusCopy = {
  body: string;
  tone: string;
};

export function TutorVettingStatusBanner({ copy }: { copy: StatusCopy }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`rounded-xl border p-4 text-sm ${copy.tone}`}
    >
      {copy.body}
    </motion.div>
  );
}
