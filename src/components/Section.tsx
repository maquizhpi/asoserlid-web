import React from "react";
import clsx from "clsx";

export default function Section({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string; // 👈 nuevo
}) {
  return (
    <section id={id} className={clsx("py-16 scroll-mt-24", className)}>
      <div className="max-w-6xl mx-auto px-4">
        {title && <h2 className="text-3xl font-bold mb-2">{title}</h2>}
        {subtitle && <p className="text-lg text-gray-600 mb-6">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
