import Link from 'next/link';
import { Button } from '@/components/ui/Button/Button';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={`container ${styles.nav}`}>
          <div className={styles.logo}>InTender</div>
          <div className={styles.authLinks}>
            <Link href="/login">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary">Регистрация</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className={`container ${styles.hero}`}>
        <h1 className={styles.title}>
          Умный поиск <span className="text-gradient">поставщиков</span> для вашего бизнеса
        </h1>
        <p className={styles.subtitle}>
          InTender — это закрытая B2B-платформа, которая соединяет закупщиков с надежными поставщиками. 
          Загружайте спецификации, получайте предложения и выбирайте лучшие условия.
        </p>
        <div className={styles.cta}>
          <Link href="/register">
            <Button size="lg" variant="primary">Начать работу бесплатно</Button>
          </Link>
        </div>
      </section>
      
      <div className={styles.bgGlow}></div>
    </main>
  );
}
