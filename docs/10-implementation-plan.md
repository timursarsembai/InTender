# 10. План MVP

0. **Bootstrap:** monorepo, web/api, strict TS, CI, Docker, PostgreSQL/Prisma, env validation, health.
1. **Identity/Organization:** auth, роли, профиль, public/private DTO.
2. **Wallet:** ledger, balance, top-up, webhook, idempotency, reconciliation.
3. **Orders:** draft, поля, фильтр контактов, публикация 50 ₸, поиск.
4. **Files:** private upload, scan, visibility/access.
5. **Offers:** отклик 50 ₸, totals, versions, withdraw, comparison.
6. **Acceptance:** атомарный выбор, snapshot, contacts, repeat.
7. **Complaints/Admin:** жалобы, решения, санкции, refund, audit.
8. **AI Specification:** paid job, queue, extraction/redaction, позиция, review UI.
9. **Rating/Polish:** рейтинг опыта контакта, notifications, analytics, security review, deploy.

Каждый этап — работающий вертикальный срез. Не создавать пустые абстракции будущих этапов.
