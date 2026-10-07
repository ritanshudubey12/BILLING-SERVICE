import { Request, Response } from 'express';
import {
  db,
  toPlanDTO,
  toSubscriptionDTO,
  toInvoiceDTO,
  toPaymentDTO,
  toUsageDTO,
  DBBillingPlan,
  DBSubscription,
  DBInvoice,
  DBPayment,
  DBUsageRecord,
  DBIdempotencyRecord
} from '../data/database.js';
import { generateTestToken } from '../middleware/authGuard.js';

// Helper to safely parse BIGINT from string/number
const parseBigIntSafe = (val: any): bigint | null => {
  if (val === undefined || val === null || val === '') return null;
  try {
    return BigInt(val);
  } catch {
    return null;
  }
};

/**
 * 1. GET /api/v1/billing/plans
 * Purpose: List all active billing plans
 * Auth: Bearer JWT
 */
export const getBillingPlans = (_req: Request, res: Response) => {
  const activePlans = db.plans.filter((p) => p.is_active).map(toPlanDTO);
  res.json({
    success: true,
    data: activePlans
  });
};

/**
 * 2. POST /api/v1/billing/plans
 * Purpose: Create a new billing plan
 * Auth: Bearer JWT
 */
export const createBillingPlan = (req: Request, res: Response) => {
  const { name, description, amount, currency = 'INR', interval = 'MONTHLY' } = req.body;

  if (!name || amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Plan name and valid numeric amount are required'
    });
  }

  const newPlan: DBBillingPlan = {
    id: db.getNextPlanId(),
    name,
    description: description || '',
    amount: Number(amount),
    currency: currency.toUpperCase(),
    interval: interval.toUpperCase(),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  db.plans.push(newPlan);

  res.status(201).json({
    success: true,
    message: 'Billing plan created successfully',
    data: toPlanDTO(newPlan)
  });
};

/**
 * 3. GET /api/v1/billing/subscription
 * Purpose: Get latest subscription for the authenticated organization
 * Auth: Bearer JWT
 */
export const getOrganizationSubscription = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);

  if (!orgId) {
    return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid organization ID' });
  }

  // Find latest subscription for this organization
  const orgSubs = db.subscriptions
    .filter((s) => s.organization_id === orgId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  if (orgSubs.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `No subscription found for organization ${req.user!.organizationId}`
    });
  }

  const latestSub = orgSubs[0];
  const plan = db.plans.find((p) => p.id === latestSub.plan_id);

  res.json({
    success: true,
    data: toSubscriptionDTO(latestSub, plan)
  });
};

/**
 * 4. POST /api/v1/billing/subscriptions
 * Purpose: Create a new subscription for the organization
 * Auth: Bearer JWT + Idempotency-Key
 */
export const createSubscription = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);
  const userId = parseBigIntSafe(req.user!.userId) || 10001n;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Enforce Idempotency-Key
  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Missing required Idempotency-Key header for subscription creation'
    });
  }

  // Check duplicate Idempotency-Key for this organization
  const existingIdemp = db.idempotencyRecords.find(
    (r) => r.organization_id === orgId && r.idempotency_key === idempotencyKey
  );

  if (existingIdemp) {
    // Return existing record instead of creating duplicate
    return res.status(200).json(existingIdemp.response_body);
  }

  const { plan_id, billing_cycle = 'MONTHLY' } = req.body;
  const parsedPlanId = parseBigIntSafe(plan_id);

  if (!parsedPlanId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Valid plan_id (BIGINT) is required'
    });
  }

  const plan = db.plans.find((p) => p.id === parsedPlanId && p.is_active);
  if (!plan) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Billing plan with id ${plan_id} not found`
    });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (billing_cycle.toUpperCase() === 'ANNUAL') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 30);
  }

  const newSub: DBSubscription = {
    id: db.getNextSubscriptionId(),
    organization_id: orgId!,
    plan_id: plan.id,
    billing_cycle: billing_cycle.toUpperCase(),
    status: 'ACTIVE',
    created_by: userId,
    period_start: now,
    period_end: periodEnd,
    cancel_at_period_end: false,
    created_at: now,
    updated_at: now
  };

  db.subscriptions.push(newSub);

  // Generate initial invoice for subscription
  const subtotal = plan.amount;
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const invoice: DBInvoice = {
    id: db.getNextInvoiceId(),
    organization_id: orgId!,
    subscription_id: newSub.id,
    invoice_number: `INV-${now.getFullYear()}-${req.user!.organizationId}-${newSub.id}`,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    status: 'PENDING',
    issue_date: now,
    due_date: periodEnd,
    created_at: now,
    updated_at: now
  };

  db.invoices.push(invoice);

  const responseBody = {
    success: true,
    message: 'Subscription created successfully',
    data: {
      subscription: toSubscriptionDTO(newSub, plan),
      invoice: toInvoiceDTO(invoice)
    }
  };

  // Record idempotency
  db.idempotencyRecords.push({
    id: db.getNextIdempotencyId(),
    organization_id: orgId!,
    idempotency_key: idempotencyKey,
    resource_type: 'SUBSCRIPTION',
    resource_id: newSub.id,
    response_body: responseBody,
    created_at: now
  });

  res.status(201).json(responseBody);
};

/**
 * 5. GET /api/v1/billing/invoices
 * Purpose: List invoices for the authenticated organization
 * Auth: Bearer JWT
 */
export const getOrganizationInvoices = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);

  const orgInvoices = db.invoices
    .filter((i) => i.organization_id === orgId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .map(toInvoiceDTO);

  res.json({
    success: true,
    count: orgInvoices.length,
    data: orgInvoices
  });
};

/**
 * 6. GET /api/v1/billing/invoices/:id
 * Purpose: Get specific invoice by ID scoped to organization
 * Auth: Bearer JWT
 */
export const getInvoiceById = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);
  const invoiceId = parseBigIntSafe(req.params.id);

  if (!invoiceId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid invoice ID parameter. Must be a valid BIGINT'
    });
  }

  // Tenant isolated lookup
  const invoice = db.invoices.find((i) => i.id === invoiceId && i.organization_id === orgId);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Invoice ${req.params.id} not found for this organization`
    });
  }

  const payments = db.payments.filter((p) => p.invoice_id === invoice.id).map(toPaymentDTO);

  res.json({
    success: true,
    data: {
      ...toInvoiceDTO(invoice),
      payments
    }
  });
};

/**
 * 7. POST /api/v1/billing/payments
 * Purpose: Record payment against invoice & update invoice to PAID
 * Auth: Bearer JWT + Idempotency-Key
 */
export const recordPayment = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);
  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Enforce Idempotency-Key
  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Missing required Idempotency-Key header for payment operation'
    });
  }

  // Check duplicate Idempotency-Key for this organization
  const existingIdemp = db.idempotencyRecords.find(
    (r) => r.organization_id === orgId && r.idempotency_key === idempotencyKey
  );

  if (existingIdemp) {
    return res.status(200).json(existingIdemp.response_body);
  }

  const { invoice_id, amount, provider = 'RAZORPAY', provider_payment_id } = req.body;
  const parsedInvoiceId = parseBigIntSafe(invoice_id);

  if (!parsedInvoiceId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Valid invoice_id (BIGINT) is required'
    });
  }

  // Scoped to organization
  const invoice = db.invoices.find((i) => i.id === parsedInvoiceId && i.organization_id === orgId);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Invoice with id ${invoice_id} not found for this organization`
    });
  }

  const payAmount = amount !== undefined ? Number(amount) : invoice.total_amount;
  const now = new Date();

  const newPayment: DBPayment = {
    id: db.getNextPaymentId(),
    organization_id: orgId!,
    invoice_id: invoice.id,
    amount: payAmount,
    provider: provider.toUpperCase(),
    provider_payment_id: provider_payment_id || `pay_${Date.now()}`,
    status: 'SUCCESS',
    idempotency_key: idempotencyKey,
    payment_date: now,
    created_at: now
  };

  db.payments.push(newPayment);

  // Update Invoice state to PAID
  invoice.status = 'PAID';
  invoice.updated_at = now;

  // If invoice is linked to a subscription, ensure subscription is ACTIVE
  if (invoice.subscription_id) {
    const sub = db.subscriptions.find((s) => s.id === invoice.subscription_id);
    if (sub) {
      sub.status = 'ACTIVE';
      sub.updated_at = now;
    }
  }

  const responseBody = {
    success: true,
    message: 'Payment recorded and invoice marked as PAID',
    data: {
      payment: toPaymentDTO(newPayment),
      invoice: toInvoiceDTO(invoice)
    }
  };

  // Record idempotency
  db.idempotencyRecords.push({
    id: db.getNextIdempotencyId(),
    organization_id: orgId!,
    idempotency_key: idempotencyKey,
    resource_type: 'PAYMENT',
    resource_id: newPayment.id,
    response_body: responseBody,
    created_at: now
  });

  res.status(201).json(responseBody);
};

/**
 * 8. PATCH /api/v1/billing/subscription/cancel
 * Purpose: Cancel current subscription for organization
 * Auth: Bearer JWT
 */
export const cancelSubscription = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);

  const sub = db.subscriptions.find((s) => s.organization_id === orgId && s.status === 'ACTIVE');

  if (!sub) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'No active subscription found to cancel'
    });
  }

  sub.status = 'CANCELLED';
  sub.cancel_at_period_end = true;
  sub.updated_at = new Date();

  const plan = db.plans.find((p) => p.id === sub.plan_id);

  res.json({
    success: true,
    message: 'Subscription cancelled successfully. Access remains active until period end.',
    data: toSubscriptionDTO(sub, plan)
  });
};

/**
 * 9. POST /api/v1/billing/usage
 * Purpose: Record metered consumption (CRM_CONTACTS, WHATSAPP_CREDITS, etc.)
 * Auth: Bearer JWT
 */
export const recordUsage = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);
  const userId = parseBigIntSafe(req.user!.userId) || 10001n;
  const { metric, quantity } = req.body;

  const parsedQty = parseBigIntSafe(quantity);
  if (!metric || parsedQty === null || parsedQty <= 0n) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Valid metric name and positive quantity (BIGINT) are required'
    });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const usageRecord: DBUsageRecord = {
    id: db.getNextUsageId(),
    organization_id: orgId!,
    user_id: userId,
    metric: String(metric).toUpperCase(),
    quantity: parsedQty,
    period_start: now,
    period_end: periodEnd,
    created_at: now
  };

  db.usageRecords.push(usageRecord);

  res.status(201).json({
    success: true,
    message: 'Usage metric recorded successfully',
    data: toUsageDTO(usageRecord)
  });
};

/**
 * 10. GET /api/v1/billing/usage
 * Purpose: Get usage records for organization
 * Auth: Bearer JWT
 */
export const getOrganizationUsage = (req: Request, res: Response) => {
  const orgId = parseBigIntSafe(req.user!.organizationId);

  const records = db.usageRecords
    .filter((u) => u.organization_id === orgId)
    .map(toUsageDTO);

  res.json({
    success: true,
    count: records.length,
    data: records
  });
};

/**
 * 11. POST /api/v1/auth/token
 * Helper endpoint to issue test JWT tokens for Postman & testing
 */
export const generateTokenEndpoint = (req: Request, res: Response) => {
  const { sub = '10001', organization_id = '50001', roles = ['OWNER'], permissions = ['billing:read', 'billing:write'] } = req.body;

  const token = generateTestToken({
    sub: String(sub),
    organization_id: String(organization_id),
    roles,
    permissions
  });

  res.json({
    success: true,
    token,
    token_type: 'Bearer',
    expires_in: 31536000,
    payload: {
      sub: String(sub),
      organization_id: String(organization_id),
      roles,
      permissions
    }
  });
};
