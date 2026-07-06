import Link from 'next/link';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { cn } from '@/lib/utils';

type Variant = 'signup' | 'login' | 'verify';

type Props = {
  variant: Variant;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthPageShell({ variant, title, subtitle, children, footer, className }: Props) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthBrandPanel variant={variant} />

      <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-8 lg:px-12 xl:px-20">
        <div className={cn('mx-auto w-full max-w-[420px]', className)}>
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/30">
                S
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">ShopEasy</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </div>

          {footer && <div className="mt-6 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
