import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card = ({ children, className, style, onClick }: CardProps) => {
  return (
    <div 
      className={`${styles.card} ${onClick ? styles.clickable : ''} ${className || ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
