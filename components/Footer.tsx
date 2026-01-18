"use client";

import { motion } from "framer-motion";
import { Instagram, Facebook, Mail, Linkedin } from "lucide-react";
import { KlaroCookieSettingsButton } from "./KlaroCookieConsent";

export const Footer = () => {
  const socialLinks = [
    {
      name: "Instagram",
      href: "https://instagram.com/berkcandaily",
      icon: Instagram,
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/berk-can-atesoglu/",
      icon: Linkedin,
    },
    {
      name: "Email",
      href: "mailto:atesoglu.berkcan@outlook.com",
      icon: Mail,
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-12 pb-8 text-center"
    >
      {/* Social icons */}
      <div className="mb-4 flex items-center justify-center gap-4">
        {socialLinks.map((social, index) => (
          <motion.a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            whileHover={{ scale: 1.2, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors hover:bg-violet-500 hover:text-white"
          >
            <social.icon size={18} />
          </motion.a>
        ))}
      </div>

      {/* Legal links */}
      <div className="mb-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <a
          href="/impressum"
          className="transition-colors hover:text-violet-500 hover:underline"
        >
          Impressum
        </a>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <a
          href="/datenschutz"
          className="transition-colors hover:text-violet-500 hover:underline"
        >
          Datenschutz
        </a>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <KlaroCookieSettingsButton />
      </div>

      {/* Copyright */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} Berk-Can Atesoglu. Alle Rechte vorbehalten.
      </p>
    </motion.footer>
  );
};
