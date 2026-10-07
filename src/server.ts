import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import billingRoutes from './routes/billingRoutes.js';
import { generateTokenEndpoint } from './controllers/triostackBillingController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generateTestToken } from './middleware/authGuard.js';
import { db, toPlanDTO, toSubscriptionDTO, toInvoiceDTO, toPaymentDTO } from './data/database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 1. Health Check (Section 8: GET /api/v1/health)
app.get(['/api/v1/health', '/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Triostack Billing API Microservice',
    module: 'Billing API Microservice',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    features: [
      'Bearer JWT Authentication',
      'Organization / Tenant Isolation (organization_id)',
      'PostgreSQL BIGINT Serialization Strategy',
      'Idempotency-Key Protection',
      'Plans, Subscriptions, Invoices, Payments, Usage'
    ]
  });
});

// 2. Auth Helper for Postman & Integration Testing
app.post('/api/v1/auth/token', generateTokenEndpoint);

// 3. Core Billing API Microservice Routes (Section 8: /api/v1/billing/*)
app.use('/api/v1/billing', billingRoutes);

// 4. Download Postman Collection
app.get('/api/v1/postman-collection.json', (_req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'postman_collection.json');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, message: 'Postman collection file not found' });
  }
});

// 5. Interactive Browser Testing Console
app.get('/', (_req: Request, res: Response) => {
  const defaultToken = generateTestToken();
  const plans = db.plans.map(toPlanDTO);
  const subs = db.subscriptions.map((s) => toSubscriptionDTO(s));
  const invoices = db.invoices.map(toInvoiceDTO);
  const payments = db.payments.map(toPaymentDTO);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Triostack Billing API Microservice</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(23, 32, 54, 0.85);
      --border: rgba(99, 102, 241, 0.25);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent-indigo: #6366f1;
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(circle at 10% 20%, #1e1b4b 0%, #0b0f19 70%);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1.5rem;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: var(--accent-green);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .pulse {
      width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%;
      box-shadow: 0 0 10px var(--accent-green); animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(12px);
    }
    h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; }
    .token-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
      color: #38bdf8;
      margin-bottom: 1rem;
    }
    .endpoint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 0.5rem;
      font-family: monospace;
      font-size: 0.9rem;
    }
    .method {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }
    .get { background: #0284c7; color: #fff; }
    .post { background: #059669; color: #fff; }
    .patch { background: #d97706; color: #fff; }
    .badge-auth {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    .badge-idemp {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    .btn {
      background: var(--accent-indigo);
      color: #fff;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--accent-indigo);
      color: #a5b4fc;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    pre { background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1 style="font-size: 1.85rem; font-weight: 800; background: linear-gradient(to right, #818cf8, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">TRIOSTACK BILLING API MICROSERVICE</h1>
        <p style="color: var(--text-muted); margin-top: 0.3rem;">Module-Based Technical & Functional Implementation • Port ${PORT}</p>
      </div>
      <div class="badge">
        <span class="pulse"></span> Active & Ready
      </div>
    </header>

    <div class="card">
      <h2>🔐 Authenticated Identity & Context (Section 3-5)</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem;">
        All protected routes require <code>Authorization: Bearer &lt;JWT&gt;</code>. Tenant isolation is enforced via <code>organization_id</code> extracted from token.
      </p>
      <div class="token-box">
        <strong>Default Test JWT Token (Org 50001, User 10001, Roles: OWNER):</strong><br/>
        ${defaultToken}
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <a class="btn" href="/api/v1/postman-collection.json" download="triostack_billing_postman_collection.json">📥 Download Postman Collection</a>
        <a class="btn btn-outline" href="/api/v1/health" target="_blank">🩺 Health Check (/api/v1/health)</a>
      </div>
    </div>

    <div class="card">
      <h2>📋 Section 8: API Endpoint Specification</h2>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span> <code>/api/v1/billing/plans</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">List active billing plans</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span> <code>/api/v1/billing/plans</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Create new billing plan</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span> <code>/api/v1/billing/subscription</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Get organization's latest subscription</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span> <code>/api/v1/billing/subscriptions</code>
          <span class="badge-auth">Bearer JWT</span>
          <span class="badge-idemp">Idempotency-Key</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Create subscription with plan_id & cycle</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method patch">PATCH</span> <code>/api/v1/billing/subscription/cancel</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Cancel active subscription</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span> <code>/api/v1/billing/invoices</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">List organization invoices</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span> <code>/api/v1/billing/invoices/:id</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Get invoice by BIGINT ID</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span> <code>/api/v1/billing/payments</code>
          <span class="badge-auth">Bearer JWT</span>
          <span class="badge-idemp">Idempotency-Key</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Record payment & mark invoice PAID</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span> <code>/api/v1/billing/usage</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Record metered consumption</span>
      </div>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span> <code>/api/v1/billing/usage</code>
          <span class="badge-auth">Bearer JWT</span>
        </div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Get usage records</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>📦 Active Billing Plans (${plans.length})</h2>
        <pre>${JSON.stringify(plans, null, 2)}</pre>
      </div>

      <div class="card">
        <h2>🧾 Sample Invoices (${invoices.length})</h2>
        <pre>${JSON.stringify(invoices, null, 2)}</pre>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Triostack Billing API endpoint not found. See documentation at /'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 TRIOSTACK BILLING API MICROSERVICE RUNNING!`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`📥 Postman Collection: http://localhost:${PORT}/api/v1/postman-collection.json`);
  console.log(`📑 Report Specification Implemented & Live!`);
  console.log(`=======================================================`);
});

export default app;
