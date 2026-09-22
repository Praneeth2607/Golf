import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-md flex-col justify-center px-5 py-16 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-body">{subtitle}</p>

        <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/60 p-6">{children}</div>

        <p className="mt-6 text-center text-sm text-body">{footer}</p>
      </motion.div>
    </div>
  );
}
