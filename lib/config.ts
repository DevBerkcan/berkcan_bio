import {
  Instagram,
  Mail,
  Github,
  Globe,
  Building2,
  ShoppingBag,
  Linkedin,
  type LucideIcon,
} from "lucide-react";

export interface LinkConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  variant: "primary" | "secondary";
}

export const profileConfig = {
  name: "Berk-Can Atesoglu",
  title: "Software Developer & Entrepreneur",
  description: "Building digital solutions & innovative software since 2020",
  image: "/profile.jpg",
};

export const socialLinks: LinkConfig[] = [
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
    label: "Meine Gadgets",
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
