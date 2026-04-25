import { Link } from 'react-router';
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'danger' | 'accent';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    to?: string;
    prefetch?: 'intent' | 'render' | 'none' | 'viewport';
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
    fullWidth?: boolean;
    reloadDocument?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', to, prefetch, icon, rightIcon, isLoading, fullWidth, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-[#234745] text-white hover:opacity-90 shadow-md hover:shadow-lg',
            secondary: 'bg-[#BBCFCD] text-[#234745] hover:opacity-90 shadow-md hover:shadow-lg',
            accent: 'bg-[#FEF8EB] text-[#234745] hover:opacity-90 shadow-md hover:shadow-lg',
            outline: 'border-2 border-[#234745] text-[#234745] hover:bg-[#234745] hover:text-white transition-colors',
            ghost: 'text-[#234745] hover:bg-[#234745]/5',
            light: 'bg-white text-[#234745] border border-gray-100 hover:bg-gray-50 shadow-sm hover:shadow',
            danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
        };

        const sizes = {
            sm: 'px-4 py-1.5 text-[13px] rounded-full',
            md: 'px-6 py-2.5 text-[15px] rounded-full',
            lg: 'px-8 py-3.5 text-[17px] rounded-full',
            xl: 'px-10 py-4.5 text-[19px] rounded-full font-black',
        };

        const childCount = React.Children.toArray(children).filter(Boolean).length;
        const baseStyles = cn(
            'inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-ar',
            childCount > 0 ? 'gap-2' : 'gap-0'
        );
        const widthStyles = fullWidth ? 'w-full' : '';

        const content = (
            <>
                {isLoading && (
                    <svg className="animate-spin -mr-1 ml-2 h-4 w-4 text-current outline-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {!isLoading && icon && <span className="flex items-center shrink-0">{icon}</span>}
                {children !== undefined && children !== null && (
                    <span className="truncate">{children}</span>
                )}
                {!isLoading && rightIcon && <span className="flex items-center shrink-0">{rightIcon}</span>}
            </>
        );

        const combinedClassName = cn(baseStyles, variants[variant], sizes[size], widthStyles, className);

        if (to) {
            return (
                <Link to={to} prefetch={prefetch} className={combinedClassName} {...(props as any)}>
                    {content}
                </Link>
            );
        }

        return (
            <button ref={ref as any} className={combinedClassName} {...props}>
                {content}
            </button>
        );
    }
);

Button.displayName = 'Button';
