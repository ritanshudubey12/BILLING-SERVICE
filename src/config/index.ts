import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'TrioStack Billing & Subscription Microservice',
  serviceVersion: '1.2.0',
  defaultCurrency: (process.env.DEFAULT_CURRENCY || 'INR') as 'INR' | 'USD' | 'EUR' | 'GBP',
  apiKey: process.env.SERVICE_API_KEY || 'triostack-secret-key-2026',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  gateways: {
    razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_trio123456',
    stripeKey: process.env.STRIPE_SECRET_KEY || 'sk_test_trio123456'
  }
};
