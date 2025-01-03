// components/agent-console/utils/constants.ts

export const SESSION_STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-500',
  completed: 'bg-yellow-500/10 text-yellow-500',
  abandoned: 'bg-red-500/10 text-red-500',
} as const;

export const fadeAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
