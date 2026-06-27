import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

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
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <div className="space-y-2">
          <h1 className={cx('page-title', tone === 'inverse' ? 'text-white' : 'text-teal')}>{title}</h1>
          {description ? <p className={cx('body-copy max-w-2xl', tone === 'inverse' ? 'text-white/72' : 'text-muted')}>{description}</p> : null}
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
    <section className={cx('fd-card p-5 sm:p-6', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h2 className="section-title mt-3 text-teal">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx('fd-subcard p-4 sm:p-5', className)}>{children}</div>;
}

export function MissionCard({
  eyebrow,
  title,
  subtitle,
  metadata = [],
  description,
  primaryAction,
  secondaryAction,
  status,
  image,
  className = ''
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string }>;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  status?: string;
  image?: {
    src: string | null | undefined;
    alt: string;
    objectPosition?: CSSProperties['objectPosition'];
  };
  className?: string;
}) {
  return (
    <section className={cx('mission-card', className)}>
      {image ? (
        <MediaFrame
          src={image.src}
          alt={image.alt}
          tone="dark"
          wrapperClassName="absolute inset-y-0 right-0 hidden w-[36%] rounded-[inherit] md:block"
          imageClassName="h-full w-full object-cover opacity-50"
          imageStyle={{ objectPosition: image.objectPosition ?? 'center' }}
        />
      ) : null}
      <div className="mission-card__overlay" />
      <div className="relative z-10 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          {eyebrow ? <SectionEyebrow inverse>{eyebrow}</SectionEyebrow> : null}
          {status ? <Badge tone="dark" variant={statusToBadgeVariant(status)}>{status}</Badge> : null}
        </div>
        <h2 className="display-title mt-4 text-white">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold">{subtitle}</p> : null}
        {description ? <p className="body-copy mt-4 max-w-2xl text-white/82">{description}</p> : null}
        {metadata.length ? (
          <div className="status-grid mt-5">
            {metadata.map((item) => (
              <StatusTile key={item.label} label={item.label} value={item.value} tone="dark" />
            ))}
          </div>
        ) : null}
        {(primaryAction || secondaryAction) ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StatusTile({
  label,
  value,
  helper,
  icon,
  tone = 'light',
  accent = false,
  className = ''
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  tone?: 'light' | 'dark';
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'status-tile',
        tone === 'dark' ? 'status-tile--dark' : 'status-tile--light',
        accent ? 'status-tile--accent' : '',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cx('eyebrow-text', tone === 'dark' ? 'text-white/58' : 'text-muted')}>{label}</p>
          <p className={cx('card-title mt-2 truncate', tone === 'dark' ? 'text-white' : 'text-teal')}>{value}</p>
        </div>
        {icon ? <div className={cx('pt-0.5', tone === 'dark' ? 'text-gold' : 'text-teal')}>{icon}</div> : null}
      </div>
      {helper ? <p className={cx('helper-text mt-2', tone === 'dark' ? 'text-white/68' : 'text-muted')}>{helper}</p> : null}
    </div>
  );
}

export function ActionRow({
  label,
  detail,
  status,
  actions,
  selected = false,
  disabled = false,
  className = ''
}: {
  label: string;
  detail?: string;
  status?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'action-row',
        selected ? 'action-row--selected' : '',
        disabled ? 'opacity-60' : '',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="card-title text-teal">{label}</p>
        {detail ? <p className="helper-text mt-1 text-muted">{detail}</p> : null}
      </div>
      {status ? <div className="shrink-0">{status}</div> : null}
      {actions ? <div className="action-row__actions">{actions}</div> : null}
    </div>
  );
}

export function ScheduleCard({
  eyebrow,
  dayLabel,
  date,
  title,
  focus,
  duration,
  badges = [],
  image,
  primaryAction,
  menuAction,
  className = ''
}: {
  eyebrow?: string;
  dayLabel: string;
  date: string;
  title: string;
  focus: string;
  duration: string;
  badges?: ReactNode[];
  image?: {
    src: string | null | undefined;
    alt: string;
    objectPosition?: CSSProperties['objectPosition'];
  };
  primaryAction?: ReactNode;
  menuAction?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cx('schedule-card', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {eyebrow ? <p className="eyebrow-text text-muted">{eyebrow}</p> : null}
            {badges}
          </div>
          <p className="card-title text-teal">{dayLabel}</p>
          <h3 className="section-title text-teal">{title}</h3>
          <p className="body-copy text-muted">{focus}</p>
          <p className="helper-text text-teal">{duration}</p>
          {image ? (
            <MediaFrame
              src={image.src}
              alt={image.alt}
              wrapperClassName="mt-3 h-[118px] w-full max-w-sm rounded-[20px] md:h-[130px]"
              imageClassName="h-full w-full object-cover"
              imageStyle={{ objectPosition: image.objectPosition }}
            />
          ) : null}
        </div>
        <div className="flex w-full items-center gap-2 xl:max-w-sm xl:flex-col xl:items-end">
          {primaryAction}
          {menuAction}
        </div>
      </div>
    </article>
  );
}

export function DataPanel({
  title,
  subtitle,
  actions,
  empty,
  children,
  className = ''
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  empty?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('fd-card p-5 sm:p-6', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title text-teal">{title}</h2>
          {subtitle ? <p className="helper-text mt-2 text-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {empty ?? children}
    </section>
  );
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
    <StatusTile
      label={label}
      value={value}
      helper={note}
      accent={accent}
      className={accent ? 'border-gold/35' : ''}
    />
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
  return <StatusTile label={label} value={value} helper={hint} />;
}

export function SectionEyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-gold" />
      <span className={cx('eyebrow-text', inverse ? 'text-white/62' : 'text-muted')}>{children}</span>
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

export function Badge({
  children,
  variant = 'default',
  tone = 'light'
}: {
  children: ReactNode;
  variant?: 'default' | 'completed' | 'ready' | 'planned' | 'rest' | 'structured' | 'in_progress' | 'skipped';
  tone?: 'light' | 'dark';
}) {
  const variantClass =
    variant === 'completed'
      ? tone === 'dark'
        ? 'border-white/12 bg-white text-teal'
        : 'border-teal/18 bg-teal text-white'
      : variant === 'ready'
        ? tone === 'dark'
          ? 'border-gold/25 bg-gold text-teal'
          : 'border-gold/25 bg-gold/16 text-teal'
        : variant === 'planned'
          ? tone === 'dark'
            ? 'border-white/14 bg-white/8 text-white'
            : 'border-line bg-field text-teal'
          : variant === 'rest'
            ? tone === 'dark'
              ? 'border-white/12 bg-white/6 text-white/86'
              : 'border-line bg-card text-muted'
            : variant === 'structured'
              ? tone === 'dark'
                ? 'border-gold/18 bg-gold/12 text-white'
                : 'border-line bg-white text-teal'
              : variant === 'in_progress'
                ? tone === 'dark'
                  ? 'border-gold/20 bg-gold/14 text-white'
                  : 'border-teal/16 bg-teal/8 text-teal'
                : variant === 'skipped'
                  ? tone === 'dark'
                    ? 'border-white/12 bg-white/8 text-white'
                    : 'border-gold/25 bg-gold/16 text-teal'
                  : tone === 'dark'
                    ? 'border-white/12 bg-white/6 text-white/82'
                    : 'border-line bg-card text-teal';

  return <span className={cx('inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', variantClass)}>{children}</span>;
}

export function PrimaryButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx('fd-button-accent', className)} {...props}>
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
    <button type="button" className={cx('fd-button-secondary', className)} {...props}>
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
    <button type="button" className={cx('fd-button-accent', className)} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx('inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-line bg-card text-teal', className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function InputField({
  label,
  unit,
  helper,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  unit?: string;
  helper?: string;
  error?: string;
}) {
  return (
    <label className="block">
      {label ? <span className="fd-label mb-2 block">{label}</span> : null}
      <div className="relative">
        <input
          {...props}
          className={cx('fd-input pr-12', error ? 'border-red-300' : '', className)}
          inputMode={props.inputMode ?? (props.type === 'number' ? 'decimal' : undefined)}
        />
        {unit ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">{unit}</span> : null}
      </div>
      {error ? <p className="helper-text mt-2 text-red-600">{error}</p> : helper ? <p className="helper-text mt-2 text-muted">{helper}</p> : null}
    </label>
  );
}

export function MetricInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string; unit?: string; helper?: string; error?: string }) {
  return <InputField {...props} />;
}

export function TextAreaField({
  label,
  helper,
  error,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helper?: string;
  error?: string;
}) {
  return (
    <label className="block">
      {label ? <span className="fd-label mb-2 block">{label}</span> : null}
      <textarea {...props} className={cx('w-full rounded-2xl border border-line bg-field px-4 py-3 text-base text-teal outline-none', error ? 'border-red-300' : '', className)} />
      {error ? <p className="helper-text mt-2 text-red-600">{error}</p> : helper ? <p className="helper-text mt-2 text-muted">{helper}</p> : null}
    </label>
  );
}

export function EmptyState({
  title,
  message,
  className = ''
}: {
  title: string;
  message: string;
  className?: string;
}) {
  return (
    <div className={cx('rounded-[24px] border border-line bg-[rgba(255,255,255,0.6)] px-4 py-5', className)}>
      <p className="card-title text-teal">{title}</p>
      <p className="helper-text mt-2 text-muted">{message}</p>
    </div>
  );
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
  if (tone === 'error') {
    return <EmptyState title={title} message={message} className="border-red-300 bg-red-50" />;
  }
  return <EmptyState title={title} message={message} />;
}

export function LoadingSkeleton({
  className = '',
  lines = 3
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cx('rounded-[24px] border border-line bg-white/72 p-4', className)}>
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={cx(
              'h-4 rounded-full bg-[rgba(6,20,20,0.08)]',
              index === 0 ? 'w-1/3' : index === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function MediaFrame({
  src,
  alt,
  wrapperClassName = '',
  imageClassName = '',
  imageStyle,
  loading = 'lazy',
  tone = 'dark'
}: {
  src: string | null | undefined;
  alt: string;
  wrapperClassName?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  loading?: 'lazy' | 'eager';
  tone?: 'dark' | 'light';
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const fallbackClassName =
    tone === 'dark'
      ? 'border-white/10 bg-teal/96 text-white/78'
      : 'border-line bg-field text-muted';

  return (
    <div className={cx('relative overflow-hidden', wrapperClassName)}>
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={imageClassName}
          style={imageStyle}
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed ? (
        <div className={cx('absolute inset-0 flex h-full w-full items-end justify-between border p-4', fallbackClassName)}>
          <div className="space-y-2">
            <div className="h-2.5 w-2.5 rounded-full bg-gold" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Fitness Desk</p>
          </div>
          <div className="rounded-full border border-current/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
            Media ready
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusToBadgeVariant(status: string) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  if (normalized.includes('complete')) return 'completed';
  if (normalized.includes('ready')) return 'ready';
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('rest')) return 'rest';
  if (normalized.includes('skip')) return 'skipped';
  return 'planned';
}
