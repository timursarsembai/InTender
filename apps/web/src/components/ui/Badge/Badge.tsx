import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'primary';
  children: React.ReactNode;
}

export const Badge = ({ variant = 'neutral', children }: BadgeProps) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
};
