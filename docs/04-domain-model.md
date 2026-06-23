# 04. Доменная модель

## Модули
Identity, Organizations, Verification, Wallet, Orders, Offers, Acceptance, Files, AI Specification, Complaints, Ratings, Notifications, Administration, Audit.

## Сущности

### User
`id`, `phone`, `email`, `status`, timestamps.

### Organization
`id`, `ownerUserId`, `legalType`, `legalName`, `bin`, `cityId`, `businessStartedAt`, `vatPayerStatus`, `verificationStatus`, `publicAlias`, `contacts`.

### Wallet
`id`, `userId`, `currency`, `availableBalanceMinor`, `version`.

### WalletTransaction
`id`, `walletId`, `type`, `amountMinor`, `direction`, `referenceType`, `referenceId`, `idempotencyKey`, `balanceAfterMinor`, `createdAt`.

### Order
Покупатель, статус, одна позиция, количество/единица, спецификация, бренд/модель, география, место поставки, логистика, желаемая цена, НДС, оплата, сроки, сертификаты, гарантия, `acceptedOfferId`, optimistic `version`.

### OrderAttachment
`orderId`, `fileId`, visibility: `SUPPLIERS_VISIBLE` или `OWNER_ONLY_AI_SOURCE`.

### Offer
`orderId`, supplier, status, `currentVersionId`, timestamps. Уникальность `(orderId, supplierOrganizationId)`.

### OfferVersion
Цена единицы, snapshot количества, сумма товара, доставка, итог, бренд/модель, НДС, оплата, срок, подтверждения, комментарий. Неизменяемая.

### AcceptedOfferSnapshot
Снимок заказа, версии offer, публичных/контактных данных сторон и коммерческих условий на момент принятия.

### ContactDisclosure
Связь order, buyer, supplier, причина `OFFER_ACCEPTED`.

### FileObject
Owner, storage key, имя, MIME, размер, checksum, antivirus/extraction status.

### AISpecJob
User, source file, status, price, выбранная позиция, JSON-результат, redaction report, failure code.

### Complaint / Refund / Rating / AuditEvent
Жалобы, компенсирующие возвраты, рейтинг опыта контакта и неизменяемый аудит.

## Инварианты

- quantity > 0;
- одна позиция;
- offer quantity = order quantity;
- goodsTotal = unitPrice × quantity;
- grandTotal = goodsTotal + delivery;
- один accepted offer;
- закрытый заказ не принимает отклики;
- контакты только при ContactDisclosure;
- платное действие и списание атомарны;
- idempotency key не создаёт дубль.
