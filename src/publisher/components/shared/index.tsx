import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none rounded-md select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary: 'bg-primary-container hover:bg-[#d97706] text-black hover:shadow-gold-glow font-semibold',
    secondary: 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/15 hover:border-white/25',
    ghost: 'bg-transparent hover:bg-white/5 text-on-surface-variant hover:text-on-surface',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 hover:border-red-500/50',
    emerald: 'bg-secondary-container hover:bg-emerald-600 text-white hover:shadow-emerald-glow font-semibold',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  variant?: 'ready' | 'uploading' | 'published' | 'failed' | 'scheduled' | 'validating' | 'pro' | 'gold' | 'emerald';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}> = ({ variant = 'ready', children, className = '', dot = false }) => {
  const styles = {
    ready: 'bg-secondary/15 text-secondary border-secondary/30',
    uploading: 'bg-primary-container/20 text-primary border-primary-container/40',
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/40',
    scheduled: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    validating: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    pro: 'badge-pro font-bold tracking-wider',
    gold: 'bg-primary-container/20 text-primary border-primary-container/40',
    emerald: 'bg-secondary/20 text-secondary border-secondary/30',
  };

  const dots = {
    ready: 'bg-secondary',
    uploading: 'bg-primary-container animate-pulse',
    published: 'bg-emerald-400',
    failed: 'bg-red-400',
    scheduled: 'bg-sky-400',
    validating: 'bg-purple-400 animate-spin',
    pro: 'bg-primary-container',
    gold: 'bg-primary-container',
    emerald: 'bg-secondary',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${styles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[variant]}`} />}
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  height?: string;
  showPercent?: boolean;
  colorVariant?: 'gold' | 'emerald' | 'gradient';
}> = ({ progress, className = '', height = 'h-2', showPercent = false, colorVariant = 'gradient' }) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const colors = {
    gold: 'bg-primary-container',
    emerald: 'bg-secondary-container',
    gradient: 'bg-gradient-to-r from-[#F59E0B] to-[#10B981]',
  };

  return (
    <div className={`w-full flex items-center gap-3 ${className}`}>
      <div className={`flex-1 bg-white/10 rounded-full overflow-hidden ${height} relative`}>
        <div
          className={`${colors[colorVariant]} ${height} rounded-full transition-all duration-300 relative`}
          style={{ width: `${clamped}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse-subtle" />
        </div>
      </div>
      {showPercent && (
        <span className="text-xs font-mono text-on-surface-variant min-w-[36px] text-right font-semibold">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
};
