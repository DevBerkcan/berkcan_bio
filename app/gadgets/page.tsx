"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface GadgetItem {
  name: string;
  description: string;
  image: string;
  link: string;
  category: string;
}

// Hier kannst du deine Gadgets mit Amazon-Links hinzufügen
const gadgets: GadgetItem[] = [
  {
    name: "MacBook Pro 14\"",
    description: "Mein täglicher Arbeitsbegleiter für Coding & Design",
    image: "/gadgets/macbook.jpg",
    link: "https://amzn.to/example1",
    category: "Setup",
  },
  {
    name: "Sony WH-1000XM5",
    description: "Beste Noise-Cancelling Kopfhörer für fokussiertes Arbeiten",
    image: "/gadgets/headphones.jpg",
    link: "https://amzn.to/example2",
    category: "Audio",
  },
  {
    name: "Logitech MX Master 3S",
    description: "Ergonomische Maus für lange Coding-Sessions",
    image: "/gadgets/mouse.jpg",
    link: "https://amzn.to/example3",
    category: "Setup",
  },
];

export default function GadgetsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back Button */}
        <Link href="/">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-violet-500 transition-colors mb-8"
          >
            <ArrowLeft size={20} />
            <span>Zurück</span>
          </motion.div>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/50 mb-4">
            <ShoppingBag size={32} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Meine Gadgets
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tools & Tech die ich täglich nutze
          </p>
        </motion.div>

        {/* Gadgets Grid */}
        <div className="space-y-4">
          {gadgets.map((gadget, index) => (
            <motion.a
              key={gadget.name}
              href={gadget.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all ring-1 ring-gray-200 dark:ring-gray-700"
            >
              {/* Image Placeholder */}
              <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <ShoppingBag size={32} className="text-gray-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-violet-500 uppercase tracking-wider">
                  {gadget.category}
                </span>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {gadget.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {gadget.description}
                </p>
              </div>

              {/* Arrow */}
              <ExternalLink size={20} className="text-gray-400 flex-shrink-0" />
            </motion.a>
          ))}
        </div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500"
        >
          * Einige Links sind Affiliate-Links. Du zahlst nicht mehr, aber ich erhalte eine kleine Provision.
        </motion.p>
      </div>
    </div>
  );
}
