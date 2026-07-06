import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium',
    'cursor-pointer select-none',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0',
    'active:scale-[0.97] active:translate-y-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-orange-500 text-white shadow-sm shadow-orange-500/25',
          'hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/35 hover:-translate-y-0.5',
        ].join(' '),
        destructive: [
          'bg-red-500 text-white shadow-sm shadow-red-500/20',
          'hover:bg-red-600 hover:shadow-md hover:shadow-red-500/30 hover:-translate-y-0.5',
        ].join(' '),
        outline: [
          'border border-gray-200 bg-white text-gray-700',
          'hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-sm hover:-translate-y-0.5',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
          'dark:hover:border-orange-600 dark:hover:bg-orange-950/50 dark:hover:text-orange-300',
        ].join(' '),
        secondary: [
          'bg-gray-100 text-gray-900 shadow-sm',
          'hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5',
          'dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        ].join(' '),
        ghost: [
          'text-gray-600',
          'hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm',
          'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
        ].join(' '),
        link: 'text-orange-600 underline-offset-4 hover:text-orange-700 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
