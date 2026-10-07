export interface JWTPayload {
  sub: string; // user_id (e.g. "10001")
  organization_id: string; // tenant/org context (e.g. "50001")
  roles: string[]; // e.g. ["OWNER"]
  permissions: string[]; // e.g. ["billing:read", "billing:write"]
  exp?: number;
  iat?: number;
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type BillingCycle = 'MONTHLY' | 'ANNUAL' | 'QUARTERLY';
export type PaymentMethod = 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET' | 'BANK_TRANSFER' | 'RAZORPAY' | 'STRIPE';
export type MetricType = 'CRM_CONTACTS' | 'TEAM_SEATS' | 'WHATSAPP_CREDITS' | 'STORAGE_GB' | 'AI_API_CALLS';

export interface BillingPlanDTO {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionDTO {
  id: string;
  organization_id: string;
  plan_id: string;
  billing_cycle: string;
  status: SubscriptionStatus;
  created_by: string;
  period_start: string;
  period_end: string;
  cancel_at_period_end: boolean;
  plan?: BillingPlanDTO;
  created_at: string;
  updated_at: string;
}

export interface InvoiceDTO {
  id: string;
  organization_id: string;
  subscription_id?: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentDTO {
  id: string;
  organization_id: string;
  invoice_id: string;
  amount: number;
  provider: string;
  provider_payment_id?: string;
  status: PaymentStatus;
  idempotency_key?: string;
  payment_date: string;
  created_at: string;
}

export interface UsageRecordDTO {
  id: string;
  organization_id: string;
  user_id: string;
  metric: string;
  quantity: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

// Backwards-compatible aliases
export type SubscriptionPlan = BillingPlanDTO;
export type Subscription = SubscriptionDTO;
export type Invoice = InvoiceDTO;
export type PaymentRecord = PaymentDTO;
export type UsageRecord = UsageRecordDTO;

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  taxRatePercent: number;
  sku?: string;
  category?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  companyName: string;
  billingEmail: string;
  phone: string;
  currency: Currency;
  taxId?: string;
  country: string;
  currentPlanId: string;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  isUsageCharge?: boolean;
}

export interface WebhookEvent {
  id: string;
  event: string;
  tenantId: string;
  payload: Record<string, any>;
  dispatchedAt: string;
  delivered: boolean;
}

export interface TrioStackSaaSMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  totalRevenueCollected: number;
  totalInvoiced: number;
  pendingBalance: number;
  currency: Currency;
  planBreakdown: {
    planCode: string;
    planName: string;
    subscribersCount: number;
    monthlyRevenue: number;
  }[];
}
