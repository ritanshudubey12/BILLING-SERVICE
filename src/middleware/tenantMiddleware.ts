import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export const tenantContext = (req: Request, _res: Response, next: NextFunction) => {
  // Support tenant ID via header, query parameter, or default to main tenant
  const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-organization-id'];
  const tenantQuery = req.query.tenantId as string;

  req.tenantId = (tenantHeader as string) || tenantQuery || 'org-trio-001';
  next();
};

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  // Optional security check for microservice-to-microservice communication
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  // If not provided in development mode, we allow it with a warning
  if (process.env.NODE_ENV === 'production' && !apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing x-api-key header for TrioStack microservice'
    });
  }
  next();
};
