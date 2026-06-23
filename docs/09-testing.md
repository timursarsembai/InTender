# 09. Тестирование

## Уровни
Unit домена; integration БД/транзакций/queues; API e2e; browser e2e; security и load tests.

## Критические сценарии
- границы баланса и параллельные списания;
- replay idempotency/webhook;
- ledger = wallet;
- публикация только DRAFT;
- запрет контактов;
- одна позиция и полный объём;
- один offer;
- version history;
- серверный расчёт сумм;
- конкурентный accept;
- один winner;
- контакты только двум сторонам;
- immutable snapshot;
- access control файлов;
- AI source скрыт;
- multi-position AI, invalid JSON, timeout, prompt injection, refund path;
- попытки получить legalName/BIN через API.

## Definition of Done
Acceptance criteria, миграции, tests, lint, typecheck, OpenAPI, отсутствие утечек, документация и observability для критических операций.
