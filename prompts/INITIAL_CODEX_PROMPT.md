# Первый промпт для Codex

Открой репозиторий InTender.

1. Прочитай `AGENTS.md`, `PLANS.md`, `README.md` и все `docs/`.
2. Кратко изложи понимание продукта, инварианты и ограничения.
3. Исследуй текущее состояние.
4. Создай execution plan этапа 0.
5. Если репозиторий пустой, создай bootstrap monorepo:
   - Next.js web;
   - NestJS API;
   - TypeScript strict;
   - PostgreSQL + Prisma;
   - Docker Compose;
   - shared contracts;
   - lint/format/test/typecheck;
   - CI;
   - env validation;
   - health/readiness.
6. Пока не реализуй Wallet, Orders и Offers, кроме реально необходимой структуры.
7. Не создавай god-object, универсальные services/repositories или преждевременные абстракции.
8. Используй актуальные стабильные зависимости.
9. Запусти проверки.
10. Сообщи структуру, команды, проверки, риски и следующий шаг.

Работай автономно в пределах этой задачи. При неоднозначности выбирай минимальное безопасное решение, согласованное с документацией.
