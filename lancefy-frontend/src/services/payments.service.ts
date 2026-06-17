import { authHttp } from "@/lib/authHttp";
import type { EscrowHolding, FinanceSummary, PaymentTransaction } from "@/types";

export interface PaymentSetup {
  omise_enabled: boolean;
  public_key?: string | null;
  livemode: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  gateway_provider: string;
  type: string;
  brand?: string | null;
  last4: string;
  exp_month?: number | null;
  exp_year?: number | null;
  holder_name?: string | null;
  bank_name?: string | null;
  country?: string | null;
  is_default: boolean;
  status: string;
  verified_at?: string | null;
  created_at: string;
}

export interface PaymentMethodActionResponse {
  message: string;
  payment_method: SavedPaymentMethod;
}

export interface CreateSavedPaymentMethodPayload {
  token: string;
  holder_name?: string;
  set_as_default?: boolean;
}

export interface OmiseRecipient {
  id: string;
  omise_recipient_id: string;
  omise_bank_code?: string | null;
  omise_account_last4?: string | null;
  recipient_status: string;
  verified_at?: string | null;
  disabled_at?: string | null;
  last_synced_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
}

export interface PayoutAccount {
  id: string;
  user_id: string;
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number_masked: string;
  currency: string;
  country: string;
  consent_given: boolean;
  consent_given_at?: string | null;
  status: string;
  is_default: boolean;
  verified_at?: string | null;
  disabled_at?: string | null;
  rejection_reason?: string | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
  omise_recipient?: OmiseRecipient | null;
}

export interface UpsertPayoutAccountPayload {
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number?: string;
  consent_given: boolean;
  set_as_default?: boolean;
}

export interface FundMilestoneQuote {
  milestone_id: string;
  milestone_amount: number;
  estimated_gateway_fee: number;
  total_charge_amount: number;
  currency: string;
}

export function getPaymentSetup() {
  return authHttp.get<PaymentSetup>("/payments/setup");
}

export function listSavedPaymentMethods() {
  return authHttp.get<SavedPaymentMethod[]>("/payments/methods");
}

export function createSavedPaymentMethod(payload: CreateSavedPaymentMethodPayload) {
  return authHttp.post<PaymentMethodActionResponse>("/payments/methods/cards", payload);
}

export function setDefaultSavedPaymentMethod(paymentMethodId: string) {
  return authHttp.post<PaymentMethodActionResponse>(`/payments/methods/${paymentMethodId}/default`);
}

export function deleteSavedPaymentMethod(paymentMethodId: string) {
  return authHttp.delete<PaymentMethodActionResponse>(`/payments/methods/${paymentMethodId}`);
}

export function getMyPayoutAccount() {
  return authHttp.get<PayoutAccount | null>("/payments/payout-account");
}

export function upsertMyPayoutAccount(payload: UpsertPayoutAccountPayload) {
  return authHttp.put<PayoutAccount>("/payments/payout-account", payload);
}

export function getFundMilestoneQuote(milestoneId: string) {
  return authHttp.get<FundMilestoneQuote>(`/payments/escrow/${milestoneId}/quote`);
}

export function fundMilestone(milestoneId: string, amount: number) {
  return authHttp.post<EscrowHolding>("/payments/escrow/fund", {
    milestone_id: milestoneId,
    amount,
  });
}

export function releaseMilestoneEscrow(milestoneId: string) {
  return authHttp.post<EscrowHolding>(`/payments/escrow/${milestoneId}/release`);
}

export function refundMilestoneEscrow(milestoneId: string) {
  return authHttp.post<EscrowHolding>(`/payments/escrow/${milestoneId}/refund`);
}

export function getEscrow(milestoneId: string) {
  return authHttp.get<EscrowHolding>(`/payments/escrow/${milestoneId}`);
}

export function listTransactions(params: { skip?: number; limit?: number } = {}) {
  return authHttp.get<PaymentTransaction[]>("/payments/transactions", { params });
}

export function getFinanceSummary() {
  return authHttp.get<FinanceSummary>("/payments/summary");
}
