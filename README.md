# 🚀 Triostack Billing API Microservice

> **Module-Based Technical & Functional Implementation** for the Triostack Business Ecosystem.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-green?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma)

---

## 📌 Overview

The **Triostack Billing Service** manages the entire commercial and payment lifecycle for organizations within the Triostack Platform. It provides:
- **Bearer JWT Authentication** (`sub`, `organization_id`, `roles`, `permissions`).
- **Strict Multi-Tenant / Organization Isolation** (`organization_id` derived directly from verified JWT).
- **PostgreSQL BIGINT Data Strategy** with safe string serialization in JSON responses.
- **Idempotency Protection** (`Idempotency-Key` header) to prevent duplicate subscriptions and payments on network retries.
- **Billing Plans, Subscriptions, Invoices, Payments, and Metered Usage Tracking**.

---

## 🛠️ API Specification

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health & uptime probe | Public |
| `POST` | `/api/v1/auth/token` | Generate test Bearer JWT token | Public |
| `GET` | `/api/v1/billing/plans` | List active billing plans | `Bearer <JWT>` |
| `POST` | `/api/v1/billing/plans` | Create a new billing plan | `Bearer <JWT>` |
| `GET` | `/api/v1/billing/subscription` | Get latest subscription for the organization | `Bearer <JWT>` |
| `POST` | `/api/v1/billing/subscriptions` | Create a subscription with plan & cycle | `Bearer <JWT>` + `Idempotency-Key` |
| `PATCH` | `/api/v1/billing/subscription/cancel` | Cancel active subscription | `Bearer <JWT>` |
| `GET` | `/api/v1/billing/invoices` | List invoices scoped to organization | `Bearer <JWT>` |
| `GET` | `/api/v1/billing/invoices/:id` | Get specific invoice by BIGINT ID | `Bearer <JWT>` |
| `POST` | `/api/v1/billing/payments` | Record payment against invoice & mark PAID | `Bearer <JWT>` + `Idempotency-Key` |
| `POST` | `/api/v1/billing/usage` | Record metered consumption | `Bearer <JWT>` |
| `GET` | `/api/v1/billing/usage` | Get usage records for organization | `Bearer <JWT>` |
| `GET` | `/api/v1/postman-collection.json` | Download complete Postman Collection | Public |

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Copy or configure `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=triostack-billing-secret-key-2026
CORS_ORIGIN=*
```

### 3. Run Locally
```bash
# Start development server with live reload
npm run dev

# Or build and run production bundle
npm run build
npm start
```

### 4. Run with Docker
```bash
# Build and run containerized service
docker compose up -d

# View logs
docker compose logs -f
```

---

## 🧪 Postman & Automated Testing

### Automated Test Suite
Run the 17-point verification suite testing all security, status codes, and idempotency guarantees:
```bash
npx tsx scripts/test-all-apis.ts
```

### Import Postman Collection
- Import `postman_collection.json` from the repository root.
- Or download directly from `http://localhost:5000/api/v1/postman-collection.json`.

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma              # PostgreSQL schema with BIGINT types
├── src/
│   ├── config/                    # Configuration settings
│   ├── controllers/
│   │   └── triostackBillingController.ts # Core API controllers
│   ├── data/
│   │   └── database.ts            # BIGINT multi-tenant DB layer & serializers
│   ├── middleware/
│   │   ├── authGuard.ts           # Bearer JWT verification & context
│   │   ├── errorHandler.ts        # Global error handler
│   │   └── tenantMiddleware.ts    # Tenant context
│   ├── routes/
│   │   └── billingRoutes.ts       # Section 8 API routes
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces & DTOs
│   └── server.ts                  # Express application entrypoint
├── scripts/
│   └── test-all-apis.ts           # 17-point automated verification suite
├── Dockerfile                     # Multi-stage production container
├── docker-compose.yml             # Docker compose configuration
├── postman_collection.json        # Postman test collection
└── package.json
```

---

## 🔒 Security & Idempotency

1. **Bearer JWT Guard**: Rejects unauthenticated requests with `401 Unauthorized`.
2. **Organization Isolation**: Every database query is scoped to `organization_id` extracted from verified JWT context.
3. **Idempotency Guarantee**: Retried requests with the same `Idempotency-Key` return the existing transaction record safely.

---

## 📄 License
ISC © Triostack Business Ecosystem
