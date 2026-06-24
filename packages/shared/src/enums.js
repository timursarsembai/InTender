'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AntivirusStatus =
  exports.ContactDisclosureReason =
  exports.OrganizationLegalType =
  exports.VerificationStatus =
  exports.LogisticsOption =
  exports.OfferVatStatus =
  exports.VatOption =
  exports.FileVisibility =
  exports.AiSpecJobStatus =
  exports.TransactionDirection =
  exports.WalletTransactionType =
  exports.OfferStatus =
  exports.OrderStatus =
  exports.UserRole =
    void 0;
var UserRole;
(function (UserRole) {
  UserRole['BUYER'] = 'BUYER';
  UserRole['SUPPLIER'] = 'SUPPLIER';
  UserRole['ADMIN'] = 'ADMIN';
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
  OrderStatus['DRAFT'] = 'DRAFT';
  OrderStatus['PUBLISHED'] = 'PUBLISHED';
  OrderStatus['CLOSED_ACCEPTED'] = 'CLOSED_ACCEPTED';
  OrderStatus['CLOSED_WITHOUT_SELECTION'] = 'CLOSED_WITHOUT_SELECTION';
  OrderStatus['CANCELLED'] = 'CANCELLED';
  OrderStatus['BLOCKED'] = 'BLOCKED';
  OrderStatus['ARCHIVED'] = 'ARCHIVED';
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OfferStatus;
(function (OfferStatus) {
  OfferStatus['ACTIVE'] = 'ACTIVE';
  OfferStatus['ACCEPTED'] = 'ACCEPTED';
  OfferStatus['REJECTED'] = 'REJECTED';
  OfferStatus['WITHDRAWN'] = 'WITHDRAWN';
})(OfferStatus || (exports.OfferStatus = OfferStatus = {}));
var WalletTransactionType;
(function (WalletTransactionType) {
  WalletTransactionType['TOP_UP'] = 'TOP_UP';
  WalletTransactionType['ORDER_PUBLICATION'] = 'ORDER_PUBLICATION';
  WalletTransactionType['OFFER_SUBMISSION'] = 'OFFER_SUBMISSION';
  WalletTransactionType['AI_SPEC_ANALYSIS'] = 'AI_SPEC_ANALYSIS';
  WalletTransactionType['REFUND'] = 'REFUND';
  WalletTransactionType['ADMIN_ADJUSTMENT'] = 'ADMIN_ADJUSTMENT';
})(WalletTransactionType || (exports.WalletTransactionType = WalletTransactionType = {}));
var TransactionDirection;
(function (TransactionDirection) {
  TransactionDirection['CREDIT'] = 'CREDIT';
  TransactionDirection['DEBIT'] = 'DEBIT';
})(TransactionDirection || (exports.TransactionDirection = TransactionDirection = {}));
var AiSpecJobStatus;
(function (AiSpecJobStatus) {
  AiSpecJobStatus['PENDING'] = 'PENDING';
  AiSpecJobStatus['PROCESSING'] = 'PROCESSING';
  AiSpecJobStatus['COMPLETED'] = 'COMPLETED';
  AiSpecJobStatus['FAILED'] = 'FAILED';
})(AiSpecJobStatus || (exports.AiSpecJobStatus = AiSpecJobStatus = {}));
var FileVisibility;
(function (FileVisibility) {
  FileVisibility['SUPPLIERS_VISIBLE'] = 'SUPPLIERS_VISIBLE';
  FileVisibility['OWNER_ONLY_AI_SOURCE'] = 'OWNER_ONLY_AI_SOURCE';
})(FileVisibility || (exports.FileVisibility = FileVisibility = {}));
var VatOption;
(function (VatOption) {
  VatOption['VAT_REQUIRED'] = 'VAT_REQUIRED';
  VatOption['VAT_NOT_REQUIRED'] = 'VAT_NOT_REQUIRED';
  VatOption['VAT_ANY'] = 'VAT_ANY';
})(VatOption || (exports.VatOption = VatOption = {}));
var OfferVatStatus;
(function (OfferVatStatus) {
  OfferVatStatus['PRICE_INCLUDES_VAT'] = 'PRICE_INCLUDES_VAT';
  OfferVatStatus['PRICE_EXCLUDES_VAT'] = 'PRICE_EXCLUDES_VAT';
  OfferVatStatus['SUPPLIER_NOT_VAT_PAYER'] = 'SUPPLIER_NOT_VAT_PAYER';
})(OfferVatStatus || (exports.OfferVatStatus = OfferVatStatus = {}));
var LogisticsOption;
(function (LogisticsOption) {
  LogisticsOption['BUYER_PICKUP'] = 'BUYER_PICKUP';
  LogisticsOption['SUPPLIER_DELIVERY'] = 'SUPPLIER_DELIVERY';
  LogisticsOption['EITHER'] = 'EITHER';
})(LogisticsOption || (exports.LogisticsOption = LogisticsOption = {}));
var VerificationStatus;
(function (VerificationStatus) {
  VerificationStatus['PENDING'] = 'PENDING';
  VerificationStatus['VERIFIED'] = 'VERIFIED';
  VerificationStatus['REJECTED'] = 'REJECTED';
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var OrganizationLegalType;
(function (OrganizationLegalType) {
  OrganizationLegalType['IP'] = 'IP';
  OrganizationLegalType['TOO'] = 'TOO';
  OrganizationLegalType['OTHER'] = 'OTHER';
})(OrganizationLegalType || (exports.OrganizationLegalType = OrganizationLegalType = {}));
var ContactDisclosureReason;
(function (ContactDisclosureReason) {
  ContactDisclosureReason['OFFER_ACCEPTED'] = 'OFFER_ACCEPTED';
})(ContactDisclosureReason || (exports.ContactDisclosureReason = ContactDisclosureReason = {}));
var AntivirusStatus;
(function (AntivirusStatus) {
  AntivirusStatus['PENDING'] = 'PENDING';
  AntivirusStatus['CLEAN'] = 'CLEAN';
  AntivirusStatus['INFECTED'] = 'INFECTED';
  AntivirusStatus['SKIPPED'] = 'SKIPPED';
})(AntivirusStatus || (exports.AntivirusStatus = AntivirusStatus = {}));
//# sourceMappingURL=enums.js.map
