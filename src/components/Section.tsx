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
    <section id={id} className={clsx("scroll-mt-24 py-20", className)}>
      <div className="max-w-6xl mx-auto px-4">
        {(title || subtitle) && (
          <div className="mb-10 max-w-3xl">
            {title && (
              <div className="flex items-center gap-4">
                <span className="h-px w-12 bg-[#33C3C9]" />
                <h2 className="text-3xl font-bold tracking-tight text-[#173C61] sm:text-4xl">
                  {title}
                </h2>
              </div>
            )}
            {subtitle && <p className="mt-3 text-lg leading-relaxed text-slate-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
