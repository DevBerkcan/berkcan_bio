"use client";

import { useState } from "react";
import { ProfileCard } from "@/components/ProfileCard";
import { LinkButton } from "@/components/LinkButton";
import { Footer } from "@/components/Footer";
import { ShareButton } from "@/components/ShareButton";
import { GitHubStats } from "@/components/GitHubStats";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ContactModal } from "@/components/ContactModal";
import { useAnalytics } from "@/hooks/useAnalytics";
import { socialLinks } from "@/lib/config";

export default function Home() {
  useAnalytics();
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen transition-colors duration-300 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Floating Share Button */}
      <ShareButton variant="floating" />

      {/* Main content */}
      <main className="relative flex min-h-screen items-center justify-center px-3 sm:px-4 py-6 sm:py-12">
        {/* Main card container */}
        <div className="w-full max-w-md">
          {/* Card with shadow */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700 transition-colors duration-300">
            {/* Profile section */}
            <ProfileCard onContactClick={() => setIsContactOpen(true)} />

            {/* GitHub Stats */}
            <GitHubStats />

            {/* Links section */}
            <div className="mt-6 space-y-3">
              {socialLinks.map((link, index) => (
                <LinkButton
                  key={link.label}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  position={index}
                  variant={link.variant}
                />
              ))}
            </div>

            {/* Footer */}
            <Footer />
          </div>

          {/* Decorative glow effects */}
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />
        </div>
      </main>

      {/* Contact Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
