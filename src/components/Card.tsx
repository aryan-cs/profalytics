export function Card({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card px-5 py-5 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted leading-relaxed">
          {footer}
        </div>
      )}
    </section>
  );
}
