"use client";

import { motion } from "framer-motion";

interface AvailabilityBadgeProps {
  available?: boolean;
}

export const AvailabilityBadge = ({ available = true }: AvailabilityBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 py-2 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-3 w-3">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            available ? "bg-green-400" : "bg-yellow-400"
          }`}
        />
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${
            available ? "bg-green-500" : "bg-yellow-500"
          }`}
        />
      </span>

      {/* Text */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {available ? "Open for Work" : "Currently Busy"}
      </span>
    </motion.div>
  );
};
