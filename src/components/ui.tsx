import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  tone = 'default'
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'default' | 'inverse';
}) {
  const titleClass = tone === 'inverse' ? 'text-white' : 'text-teal';
  const descriptionClass = tone === 'inverse' ? 'text-white/72' : 'text-muted';

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <div className="space-y-2">
          <h1 className={`text-[2rem] font-semibold leading-tight sm:text-[2.35rem] ${titleClass}`}>{title}</h1>
          {description ? <p className={`max-w-2xl text-sm leading-6 sm:text-base ${descriptionClass}`}>{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function SectionCard({
  title,
  eyebrow,
  action,
  children,
  className = ''
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`fd-card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h2 className="mt-3 text-[1.35rem] font-semibold leading-tight text-teal sm:text-[1.45rem]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`fd-subcard p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function MetricCard({
  label,
  value,
  note,
  accent = false
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-gold/35' : ''}>
      <p className="fd-label">{label}</p>
      <p className={`mt-3 ${accent ? 'text-[1.9rem]' : 'text-[1.45rem]'} font-semibold leading-none text-teal`}>{value}</p>
      {note ? <p className="mt-3 text-sm leading-5 text-muted">{note}</p> : null}
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="fd-subcard p-4">
      <p className="fd-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none text-teal">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-gold" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{children}</span>
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-teal">
      {children}
    </span>
  );
}

export function PrimaryButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`fd-button-primary ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`fd-button-secondary ${className}`} {...props}>
      {children}
    </button>
  );
}

export function AccentButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`fd-button-accent ${className}`} {...props}>
      {children}
    </button>
  );
}

export function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`fd-input ${props.className ?? ''}`.trim()} />;
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-2xl border border-line bg-field px-4 py-3 text-base text-teal outline-none ${props.className ?? ''}`.trim()} />;
}

export function StateCard({
  title,
  message,
  tone = 'neutral'
}: {
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
}) {
  const palette =
    tone === 'error'
      ? 'border-red-300 bg-red-50 text-red-700'
      : 'border-line bg-[rgba(255,255,255,0.28)] text-teal';

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${palette}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{message}</p>
    </div>
  );
}
