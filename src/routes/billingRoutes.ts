import { Router } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import {
  getBillingPlans,
  createBillingPlan,
  getOrganizationSubscription,
  createSubscription,
  getOrganizationInvoices,
  getInvoiceById,
  recordPayment,
  cancelSubscription,
  recordUsage,
  getOrganizationUsage
} from '../controllers/triostackBillingController.js';

const router = Router();

// 1. Billing Plans
router.get('/plans', authGuard, getBillingPlans);
router.post('/plans', authGuard, createBillingPlan);

// 2. Subscriptions
router.get('/subscription', authGuard, getOrganizationSubscription);
router.post('/subscriptions', authGuard, createSubscription);
router.patch('/subscription/cancel', authGuard, cancelSubscription);

// 3. Invoices
router.get('/invoices', authGuard, getOrganizationInvoices);
router.get('/invoices/:id', authGuard, getInvoiceById);

// 4. Payments
router.post('/payments', authGuard, recordPayment);

// 5. Metered Usage Records
router.post('/usage', authGuard, recordUsage);
router.get('/usage', authGuard, getOrganizationUsage);

export default router;
