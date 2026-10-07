import {
  BillingPlanDTO,
  SubscriptionDTO,
  InvoiceDTO,
  PaymentDTO,
  UsageRecordDTO
} from '../types/index.js';

export interface DBBillingPlan {
  id: bigint;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DBSubscription {
  id: bigint;
  organization_id: bigint;
  plan_id: bigint;
  billing_cycle: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED';
  created_by: bigint;
  period_start: Date;
  period_end: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DBInvoice {
  id: bigint;
  organization_id: bigint;
  subscription_id?: bigint;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  issue_date: Date;
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DBPayment {
  id: bigint;
  organization_id: bigint;
  invoice_id: bigint;
  amount: number;
  provider: string;
  provider_payment_id?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  idempotency_key?: string;
  payment_date: Date;
  created_at: Date;
}

export interface DBUsageRecord {
  id: bigint;
  organization_id: bigint;
  user_id: bigint;
  metric: string;
  quantity: bigint;
  period_start: Date;
  period_end: Date;
  created_at: Date;
}

export interface DBIdempotencyRecord {
  id: bigint;
  organization_id: bigint;
  idempotency_key: string;
  resource_type: string;
  resource_id: bigint;
  response_body: any;
  created_at: Date;
}

class TriostackDatabase {
  public plans: DBBillingPlan[] = [];
  public subscriptions: DBSubscription[] = [];
  public invoices: DBInvoice[] = [];
  public payments: DBPayment[] = [];
  public usageRecords: DBUsageRecord[] = [];
  public idempotencyRecords: DBIdempotencyRecord[] = [];

  private planSeq = 1n;
  private subSeq = 101n;
  private invSeq = 1001n;
  private paySeq = 9001n;
  private usageSeq = 1n;
  private idempSeq = 1n;

  constructor() {
    this.seedTriostackDB();
  }

  private seedTriostackDB() {
    // 1. Seed Billing Plans
    const planStarter: DBBillingPlan = {
      id: this.planSeq++, // 1n
      name: 'Triostack Starter',
      description: 'Standard plan for single team CRM and outreach',
      amount: 2499,
      currency: 'INR',
      interval: 'MONTHLY',
      is_active: true,
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01')
    };

    const planGrowth: DBBillingPlan = {
      id: this.planSeq++, // 2n
      name: 'Triostack Growth & Pro',
      description: 'Omni-channel CRM with WhatsApp & AI Automation',
      amount: 6499,
      currency: 'INR',
      interval: 'MONTHLY',
      is_active: true,
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01')
    };

    const planEnterprise: DBBillingPlan = {
      id: this.planSeq++, // 3n
      name: 'Triostack 360 Enterprise',
      description: 'Dedicated multi-pipeline workflows with SLA',
      amount: 16999,
      currency: 'INR',
      interval: 'MONTHLY',
      is_active: true,
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01')
    };

    this.plans.push(planStarter, planGrowth, planEnterprise);

    // 2. Seed Initial Subscription for default Org 50001n
    const defaultOrgId = 50001n;
    const defaultUserId = 10001n;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const sub1: DBSubscription = {
      id: this.subSeq++, // 101n
      organization_id: defaultOrgId,
      plan_id: planGrowth.id,
      billing_cycle: 'MONTHLY',
      status: 'ACTIVE',
      created_by: defaultUserId,
      period_start: now,
      period_end: periodEnd,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now
    };
    this.subscriptions.push(sub1);

    // 3. Seed Initial Invoice
    const inv1: DBInvoice = {
      id: 1n, // 1n for postman invoiceId test
      organization_id: defaultOrgId,
      subscription_id: sub1.id,
      invoice_number: 'INV-2026-50001-01',
      subtotal: 6499,
      tax_amount: 1169.82,
      total_amount: 7668.82,
      status: 'PAID',
      issue_date: now,
      due_date: periodEnd,
      created_at: now,
      updated_at: now
    };
    this.invoices.push(inv1);

    // 4. Seed Payment
    const pay1: DBPayment = {
      id: this.paySeq++,
      organization_id: defaultOrgId,
      invoice_id: inv1.id,
      amount: 7668.82,
      provider: 'RAZORPAY',
      provider_payment_id: 'pay_rzp_mock_50001_01',
      status: 'SUCCESS',
      idempotency_key: 'init-payment-50001',
      payment_date: now,
      created_at: now
    };
    this.payments.push(pay1);

    // 5. Seed Usage Record
    const usage1: DBUsageRecord = {
      id: this.usageSeq++,
      organization_id: defaultOrgId,
      user_id: defaultUserId,
      metric: 'CRM_CONTACTS',
      quantity: 1250n,
      period_start: now,
      period_end: periodEnd,
      created_at: now
    };
    this.usageRecords.push(usage1);
  }

  // Helper generators
  public getNextPlanId(): bigint {
    return this.planSeq++;
  }

  public getNextSubscriptionId(): bigint {
    return this.subSeq++;
  }

  public getNextInvoiceId(): bigint {
    return this.invSeq++;
  }

  public getNextPaymentId(): bigint {
    return this.paySeq++;
  }

  public getNextUsageId(): bigint {
    return this.usageSeq++;
  }

  public getNextIdempotencyId(): bigint {
    return this.idempSeq++;
  }
}

export const db = new TriostackDatabase();

// BIGINT Safe DTO Converters
export const toPlanDTO = (p: DBBillingPlan): BillingPlanDTO => ({
  id: p.id.toString(),
  name: p.name,
  description: p.description,
  amount: p.amount,
  currency: p.currency,
  interval: p.interval,
  is_active: p.is_active,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString()
});

export const toSubscriptionDTO = (s: DBSubscription, plan?: DBBillingPlan): SubscriptionDTO => ({
  id: s.id.toString(),
  organization_id: s.organization_id.toString(),
  plan_id: s.plan_id.toString(),
  billing_cycle: s.billing_cycle,
  status: s.status,
  created_by: s.created_by.toString(),
  period_start: s.period_start.toISOString(),
  period_end: s.period_end.toISOString(),
  cancel_at_period_end: s.cancel_at_period_end,
  plan: plan ? toPlanDTO(plan) : undefined,
  created_at: s.created_at.toISOString(),
  updated_at: s.updated_at.toISOString()
});

export const toInvoiceDTO = (i: DBInvoice): InvoiceDTO => ({
  id: i.id.toString(),
  organization_id: i.organization_id.toString(),
  subscription_id: i.subscription_id ? i.subscription_id.toString() : undefined,
  invoice_number: i.invoice_number,
  subtotal: i.subtotal,
  tax_amount: i.tax_amount,
  total_amount: i.total_amount,
  status: i.status,
  issue_date: i.issue_date.toISOString(),
  due_date: i.due_date.toISOString(),
  created_at: i.created_at.toISOString(),
  updated_at: i.updated_at.toISOString()
});

export const toPaymentDTO = (p: DBPayment): PaymentDTO => ({
  id: p.id.toString(),
  organization_id: p.organization_id.toString(),
  invoice_id: p.invoice_id.toString(),
  amount: p.amount,
  provider: p.provider,
  provider_payment_id: p.provider_payment_id,
  status: p.status,
  idempotency_key: p.idempotency_key,
  payment_date: p.payment_date.toISOString(),
  created_at: p.created_at.toISOString()
});

export const toUsageDTO = (u: DBUsageRecord): UsageRecordDTO => ({
  id: u.id.toString(),
  organization_id: u.organization_id.toString(),
  user_id: u.user_id.toString(),
  metric: u.metric,
  quantity: u.quantity.toString(),
  period_start: u.period_start.toISOString(),
  period_end: u.period_end.toISOString(),
  created_at: u.created_at.toISOString()
});
