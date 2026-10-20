import type { Transition, Variants } from "motion/react";

export const springTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

export const smoothTransition: Transition = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for smooth deceleration
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};
