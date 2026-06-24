import React from 'react';
import styles from './Table.module.css';

interface TableProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Table = ({ children }: TableProps) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>{children}</table>
    </div>
  );
};

export const TableHeader = ({ children, className, style }: TableProps) => (
  <thead className={`${styles.thead} ${className || ''}`} style={style}>
    {children}
  </thead>
);
export const TableBody = ({ children, className, style }: TableProps) => (
  <tbody className={`${styles.tbody} ${className || ''}`} style={style}>
    {children}
  </tbody>
);
export const TableRow = ({ children, className, style }: TableProps) => (
  <tr className={`${styles.tr} ${className || ''}`} style={style}>
    {children}
  </tr>
);
export const TableHead = ({ children, className, style }: TableProps) => (
  <th className={`${styles.th} ${className || ''}`} style={style}>
    {children}
  </th>
);
export const TableCell = ({ children, className, style }: TableProps) => (
  <td className={`${styles.td} ${className || ''}`} style={style}>
    {children}
  </td>
);
