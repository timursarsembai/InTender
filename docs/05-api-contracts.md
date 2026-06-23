# 05. API-контракты

REST JSON, `/api/v1`, cursor pagination, DTO validation, OpenAPI. Для платных mutations — `Idempotency-Key`.

## Основные endpoints

### Auth
`POST /auth/register`, `/login`, `/refresh`, `/logout`, `/verify-phone`, `/verify-email`.

### Organization
`GET/PATCH /me/organization`, `POST /me/organization/verification`, `GET /organizations/:id/public-profile`.

### Wallet
`GET /me/wallet`, `GET /me/wallet/transactions`, `POST /me/wallet/top-ups`, `POST /payments/webhooks/:provider`.

### Orders
`POST /orders`, `GET /orders`, `GET/PATCH /orders/:id`, `POST /orders/:id/publish`, `/cancel`, `/close-without-selection`, `/repeat`, `GET /me/orders`.

### Offers
`POST /orders/:orderId/offers`, `GET /orders/:orderId/offers` только владельцу, `GET /me/offers`, `GET/PATCH /offers/:id`, `POST /offers/:id/withdraw`, `POST /offers/:id/accept`.

### Contacts
`GET /orders/:id/disclosed-contacts` — только двум сторонам после принятия.

### Files
`POST /files/upload-intent`, `POST /files/:id/complete`, `GET /files/:id/download` с access policy и временной ссылкой.

### AI
`POST /ai-spec/jobs`, `GET /ai-spec/jobs/:id`, `POST /ai-spec/jobs/:id/select-position`, `POST /ai-spec/jobs/:id/apply-to-order`.

### Complaints/Admin
Создание жалоб, очередь администратора, resolution, block, suspend, refund. Все admin mutations аудируются.

## Коды ошибок
`VALIDATION_ERROR`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `INSUFFICIENT_BALANCE`, `ORDER_NOT_PUBLISHED`, `ORDER_ALREADY_CLOSED`, `OFFER_ALREADY_EXISTS`, `OFFER_NOT_ACTIVE`, `CONTACT_DATA_DETECTED`, `UNSUPPORTED_FILE`, `AI_JOB_FAILED`, `IDEMPOTENCY_CONFLICT`.

## Конкурентность
`accept` должен выдерживать параллельные запросы: один успешен, остальные получают `ORDER_ALREADY_CLOSED`.
