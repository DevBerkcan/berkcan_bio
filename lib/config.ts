import {
  Instagram,
  Mail,
  Github,
  Globe,
  Building2,
  ShoppingBag,
  Linkedin,
  Flame,
  Send,
  type LucideIcon,
} from "lucide-react";
import { TELEGRAM_CHANNEL_URL } from "@/lib/deals";

export interface LinkConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  variant: "primary" | "secondary" | "highlight";
}

export const profileConfig = {
  name: "Berk-Can Atesoglu",
  title: "Software Developer & Entrepreneur",
  description: "Building digital solutions & innovative software since 2020",
  image: "/profile.jpg",
};

export const socialLinks: LinkConfig[] = [
  {
    label: "Black Friday Deals",
    href: "/deals",
    icon: Flame,
    variant: "highlight",
  },
  ...(TELEGRAM_CHANNEL_URL
    ? [
        {
          label: "Telegram: Deal-Alarm",
          href: TELEGRAM_CHANNEL_URL,
          icon: Send,
          variant: "secondary" as const,
        },
      ]
    : []),
  {
    label: "GentleGroup",
    href: "https://www.gentlegroup.de",
    icon: Building2,
    variant: "primary",
  },
  {
    label: "Portfolio",
    href: "https://www.berkcanatesoglu.de",
    icon: Globe,
    variant: "primary",
  },
  {
    label: "GitHub",
    href: "https://github.com/DevBerkcan",
    icon: Github,
    variant: "primary",
  },
  {
    label: "Gadgets & Desk-Setup",
    href: "/gadgets",
    icon: ShoppingBag,
    variant: "secondary",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/berk-can-atesoglu/",
    icon: Linkedin,
    variant: "secondary",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/berkcandaily/",
    icon: Instagram,
    variant: "secondary",
  },
  {
    label: "E-Mail",
    href: "mailto:kontakt@berkcanatesoglu.de",
    icon: Mail,
    variant: "secondary",
  },
];

export const siteConfig = {
  name: "Berk-Can Atesoglu - Developer & Entrepreneur",
  description: "Software Developer & Entrepreneur aus Düsseldorf",
  url: "https://berkcandaily.vercel.app",
};
