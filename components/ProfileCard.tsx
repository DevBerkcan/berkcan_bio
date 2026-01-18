"use client";

import { motion } from "framer-motion";
import { Code2, Terminal } from "lucide-react";
import Image from "next/image";
import { TypingEffect } from "./TypingEffect";
import { AvailabilityBadge } from "./AvailabilityBadge";

interface ProfileCardProps {
  onContactClick?: () => void;
}

const roles = ["React Developer", "Next.js Expert", "TypeScript Pro", "Freelancer"];

export const ProfileCard = ({ onContactClick }: ProfileCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-8 text-center"
    >
      {/* Floating code decoration */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-6 right-8 text-violet-500 opacity-40"
        aria-hidden="true"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Code2 size={36} strokeWidth={2} />
        </motion.div>
      </motion.div>

      {/* Terminal icon on the left */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: 0.3,
          scale: 1,
          y: [0, 10, 0],
        }}
        transition={{
          opacity: { delay: 0.3, duration: 0.5 },
          scale: { delay: 0.3, duration: 0.5 },
          y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
        }}
        className="absolute -top-4 left-6 text-purple-500 opacity-30"
        aria-hidden="true"
      >
        <Terminal size={28} strokeWidth={2} />
      </motion.div>

      {/* Availability Badge */}
      <div className="mb-4 flex justify-center">
        <AvailabilityBadge available={true} />
      </div>

      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full shadow-lg ring-4 ring-white dark:ring-gray-700"
      >
        <Image
          src="/berkcan.png"
          alt="Berk-Can Atesoglu"
          width={96}
          height={96}
          className="h-full w-full object-cover"
          priority
        />
      </motion.div>

      {/* Name */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white"
      >
        Berk-Can<span className="text-violet-500">.</span>
      </motion.h1>

      {/* Subtitle with Typing Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4 px-4 text-base text-gray-600 dark:text-gray-300"
      >
        <TypingEffect words={roles} className="text-violet-500 font-semibold" />
      </motion.div>

      {/* Tech Stack Badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500"
      >
        <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 px-3 py-1">React</span>
        <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-3 py-1">Next.js</span>
        <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 px-3 py-1">TypeScript</span>
      </motion.div>

      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mx-auto mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500"
      />

      {/* CTA Section */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContactClick}
        className="mt-8 w-full rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-4 border border-violet-100 dark:border-violet-800 cursor-pointer text-left transition-colors"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Möchtest du auch so eine Präsenz haben?
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Melde dich bei mir und ich baue dir dein individuelles Linktree!
        </p>
      </motion.button>
    </motion.div>
  );
};
