# InTender

InTender — B2B-платформа поиска поставщиков товаров для тендерщиков по модели закрытых предложений.

Тендерщик публикует запрос на один товар и полный объём поставки. Поставщики отправляют закрытые предложения. Тендерщик может принять только одно предложение. После принятия заказ закрывается, а контактные данные раскрываются только двум выбранным сторонам. Дальнейшая сделка проходит вне платформы.

## Рекомендуемый стек MVP

- TypeScript;
- Next.js;
- NestJS;
- PostgreSQL + Prisma;
- Redis + BullMQ;
- S3-совместимое хранилище;
- Docker Compose;
- OpenAPI;
- Vitest/Jest и Playwright.

## Документы

- `AGENTS.md` — постоянные инструкции Codex;
- `PLANS.md` — шаблон планирования;
- `docs/01-product-overview.md` — продукт;
- `docs/02-business-rules.md` — бизнес-правила;
- `docs/03-user-flows.md` — сценарии;
- `docs/04-domain-model.md` — доменная модель;
- `docs/05-api-contracts.md` — API;
- `docs/06-architecture.md` — архитектура;
- `docs/07-ai-specification.md` — ИИ-разбор;
- `docs/08-security-and-abuse.md` — безопасность;
- `docs/09-testing.md` — тестирование;
- `docs/10-implementation-plan.md` — этапы;
- `docs/11-open-decisions.md` — нерешённые вопросы;
- `prompts/INITIAL_CODEX_PROMPT.md` — стартовый промпт.
