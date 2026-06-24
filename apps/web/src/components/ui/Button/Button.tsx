import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => {
    const rootClass = `${styles.btn} ${styles[variant]} ${styles[size]} ${className || ''}`;

    return (
      <button ref={ref} className={rootClass} disabled={disabled || isLoading} {...props}>
        {isLoading && <span className={styles.spinner}></span>}
        <span className={isLoading ? styles.hiddenContent : ''}>{children}</span>
      </button>
    );
  },
);
Button.displayName = 'Button';
