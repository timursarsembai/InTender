# InTender — Handoff для Claude Code

Этот файл — инструкция для AI-ассистента, продолжающего разработку.

## Что такое InTender

**InTender** — B2B тендерная платформа для казахстанского рынка. Покупатели публикуют заказы, поставщики откликаются, покупатель выбирает лучший оффер.

Монорепозиторий: NestJS API (порт 3001) + Next.js 14 фронтенд (порт 3000) + PostgreSQL + MinIO (S3) + Redis + Socket.IO.

```
apps/
  api/   — NestJS backend
  web/   — Next.js frontend
packages/
  shared/ — общие типы и enums
```

---

## Текущее состояние после последних коммитов

### Реализовано и работает:

1. **Auth** — регистрация, логин (JWT), переключение роли BUYER / SUPPLIER
2. **Orders** — CRUD черновиков, публикация (50 тиын), просмотр опубликованных, повтор
3. **Offers** — подача (50 тиын), редактирование, отзыв, принятие оффера (атомарное)
4. **Кошелёк** — пополнение, история транзакций, идемпотентность
5. **AI разбор спецификаций** — upload через presigned URL → `POST /v1/ai/jobs` → polling. Backend: mock (5 сек + фейковый результат). **Реальная модель НЕ подключена.**
6. **Чат** — ChatRoom, ChatMessage, WebSocket-гейтвей, REST `/v1/chat/rooms`
7. **Уведомления** — in-app, при новом отклике
8. **Раскрытие контактов** — только после принятия оффера
9. **Рейтинги** — оценка после сделки
10. **UI страница заказа** — двухколоночный layout: левая (данные + карта), правая (форма отклика для поставщика / список откликов для покупателя)
11. **Мои отклики** — с вкладками по статусам (Все / Активные / Принятые / Отклонённые / Отозванные)

---

## Критичные известные проблемы

### 1. ESLint — 450 ошибок

```bash
npm run lint  # покажет все ошибки
```

Основное:
- Много `any` → заменить типизированными интерфейсами/DTO
- Неиспользуемые переменные — убрать или префикс `_`
- `packages/shared/dist/` попадает в lint — добавить в `ignores` в `eslint.config.mjs`

### 2. AI модель не подключена

Файл: `apps/api/src/ai/ai.service.ts`, метод `processJobAsync()`

Сейчас там 5-секундный таймер + мок. Нужно подключить реальную модель:

**Рекомендуется Google Gemini 2.0 Flash** (есть нативный File API для PDF/DOCX).

Шаги:
1. Добавить `GEMINI_API_KEY` в `apps/api/src/env.ts`
2. Скачать файл из MinIO S3 через `GetObjectCommand`
3. Загрузить в Gemini File API
4. Отправить запрос с промптом разбора спецификации
5. Распарсить JSON-ответ и сохранить в `resultJson`

Формат `resultJson`:
```json
{
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "шт",
      "specification": "string",
      "brandModel": "optional string"
    }
  ]
}
```

**Промпт** должен: извлечь товарные позиции, удалить контакты/БИН/телефоны/email/URL, вернуть только структурированный JSON.

### 3. Чат — возможная несовместимость URL

`apps/web/src/app/dashboard/messages/page.tsx` использует `/chat/rooms`, а контроллер зарегистрирован как `/v1/chat/rooms`.

Проверить `apps/web/src/lib/api.ts` — base URL `http://localhost:3001`. Пути в frontend должны включать `/v1/`.

---

## Архитектурные правила (строго соблюдать)

- TypeScript strict — без `any`
- Деньги в **тиынах** (Int), 1 ₸ = 100 тиын
- Идемпотентность обязательна для всех платных мутаций
- Object-level authorization везде
- AcceptedOfferSnapshot — неизменяемая запись
- Нет god-objects/god-services

---

## API эндпоинты

Base URL: `http://localhost:3001`

### Auth
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/switch-role`

### Orders
- `POST /v1/orders` (BUYER)
- `GET /v1/orders` (публичные)
- `GET /v1/me/orders` (BUYER)
- `GET /v1/orders/:id`
- `PATCH /v1/orders/:id`
- `POST /v1/orders/:id/publish` — body `{ idempotencyKey }` — списывает 5000 тиын
- `POST /v1/orders/:id/cancel`
- `DELETE /v1/orders/:id`
- `POST /v1/orders/:id/close-without-selection`
- `POST /v1/orders/:id/repeat`
- `GET /v1/orders/:id/disclosed-contacts`

### Offers
- `POST /v1/orders/:id/offers` (SUPPLIER) — body includes `idempotencyKey` — списывает 5000 тиын
- `PATCH /v1/offers/:id`
- `POST /v1/offers/:id/withdraw`
- `POST /v1/offers/:id/accept` — body `{ idempotencyKey }`
- `GET /v1/orders/:id/offers` (BUYER)
- `GET /v1/me/offers` (SUPPLIER)

### Files
- `POST /v1/files/upload-intent` — body `{ originalName, mimeType, sizeBytes }` → `{ fileId, uploadUrl }`
- `POST /v1/files/:id/complete`
- `GET /v1/files/:id/download` → `{ downloadUrl }`

### AI
- `POST /v1/ai/jobs` — body `{ fileId, idempotencyKey }` — списывает 100000 тиын
- `GET /v1/ai/jobs/:id` → `{ status, resultJson, failureCode }`

### Wallet
- `GET /v1/wallet`
- `POST /v1/wallet/top-up` — body `{ amountMinor, idempotencyKey }`
- `GET /v1/wallet/transactions`

### Chat
- `GET /v1/chat/rooms`
- `GET /v1/chat/rooms/:id/messages`
- `POST /v1/chat/rooms/find-or-create` — body `{ orderId, supplierOrganizationId, buyerOrganizationId }`
- WebSocket: `ws://localhost:3001/chat` — events: `join_room`, `send_message`, `new_message`

### Organizations
- `GET /v1/me/organization`
- `PATCH /v1/me/organization`

### Notifications
- `GET /v1/notifications`
- `PATCH /v1/notifications/:id/read`
- `PATCH /v1/notifications/read-all`

### Ratings
- `POST /v1/ratings`

### Admin
- `GET /v1/admin/users`
- `POST /v1/admin/users/:id/block`
- `GET /v1/admin/complaints`
- `POST /v1/admin/complaints/:id/resolve`

---

## Бизнес-правила (финансовые)

| Операция | Стоимость | Idempotency key |
|---|---|---|
| Публикация заказа | 5 000 тиын (50 ₸) | обязателен |
| Подача отклика | 5 000 тиын (50 ₸) | обязателен |
| AI разбор файла | 100 000 тиын (1 000 ₸) | обязателен |
| Возврат при AI ошибке | автоматически | `refund-ai-{jobId}` |

**Ограничения:**
- Один поставщик → один отклик на заказ (unique constraint)
- Принять можно только один оффер (optimistic lock через `version`)
- Контакты раскрываются только через ContactDisclosure
- Исходный AI-файл недоступен поставщику

---

## Приоритеты дальнейшей разработки

### Высокий приоритет

1. **Подключить Gemini** в `apps/api/src/ai/ai.service.ts`
2. **Исправить lint** — убрать `any`, неиспользуемые переменные, исключить `dist/` из eslint
3. **Проверить чат** — убедиться что base URL правильный, WebSocket работает

### Средний приоритет

4. **Email-уведомления** — nodemailer/SES при новом отклике, принятии оффера
5. **Rate limiting** — `@nestjs/throttler`
6. **Поиск/фильтр заказов** — по категории, региону, дедлайну

### Низкий приоритет

7. **Верификация организаций** — загрузка документов, смена статуса
8. **Деплой** — Dockerfile, CI/CD

---

## Ключевые файлы

```
apps/api/src/
  ai/ai.service.ts        ← СЮДА подключать Gemini
  files/files.service.ts  ← presigned URL upload
  offers/offers.service.ts
  orders/orders.service.ts
  wallets/wallets.service.ts
  chat/chat.service.ts
  chat/chat.gateway.ts    ← WebSocket
  prisma/schema.prisma    ← схема БД
  env.ts                  ← добавить GEMINI_API_KEY

apps/web/src/
  app/dashboard/orders/[id]/page.tsx  ← главная страница заказа
  app/dashboard/orders/new/page.tsx   ← создание + AI разбор
  app/dashboard/offers/page.tsx       ← мои отклики с вкладками
  app/dashboard/messages/page.tsx     ← чат
  lib/api.ts                          ← fetch обёртка
  contexts/ChatContext.tsx            ← WebSocket контекст
```

---

## Локальный запуск

```bash
# Инфраструктура
docker-compose up -d

# Зависимости
npm install

# БД миграции
cd apps/api && npx prisma migrate dev

# Dev серверы (из корня)
npm run dev:api   # :3001
npm run dev:web   # :3000
```

`.env` в корне (см. `.env.example`).

---

## Обязательные тесты (из бизнес-правил)

- публикация заказа списывает 5000 тиын ровно один раз
- отклик списывает 5000 тиын ровно один раз
- AI разбор списывает 100000 тиын ровно один раз
- недостаточный баланс блокирует действие
- один поставщик не создаёт второй отклик
- принять можно только одно предложение
- принятие атомарно закрывает заказ
- контакты доступны только выбранным сторонам
- исходный AI-файл не выдаётся поставщику
- повтор заказа создаёт новый платный заказ

