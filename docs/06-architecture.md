# 06. Архитектура

## Подход
Модульный монолит в monorepo:

```text
apps/web
apps/api
packages/contracts
packages/config
packages/ui
docs
infra
```

Backend-модули делятся на `domain`, `application`, `infrastructure`, `presentation`.

## Транзакции
Публикация, отклик, AI job, принятие и возврат выполняются в PostgreSQL-транзакциях. Использовать row lock/optimistic concurrency и DB constraints.

## Фоновые задания
BullMQ: AI/OCR, антивирус, уведомления, retry временных ошибок. При окончательном техническом отказе создаётся refund, исходная проводка не удаляется.

## Файлы
Direct upload через presigned URL, quarantine, signature/MIME/checksum/antivirus, private bucket, временный download URL, отдельные политики для бесплатного файла и AI source.

## Поиск и кэш
Для MVP — PostgreSQL. Redis только для queue, rate limit, краткоживущего lock/cache. Redis не источник истины для денег.

## Наблюдаемость
Structured logs, request ID, metrics, error tracking, audit, health/readiness, метрики расхождения wallet/ledger и AI failures.

## Масштабирование
Сначала stateless API и workers. Микросервис выделяется только при доказанной независимой нагрузке, изоляции или организационной необходимости.
