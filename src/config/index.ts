import dotenv from 'dotenv';

dotenv.config();

interface Config {
  env: string;
  port: number;
  host: string;
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenTTL: string;
    refreshTokenTTL: string;
  };
  cookie: {
    domain: string;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  logging: {
    filePath: string;
    level: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authWindowMs: number;
    authMaxRequests: number;
  };
  cors: {
    origin: string | string[];
  };
  passwordReset: {
    tokenTTL: number;
  };
  ai: {
    geminiApiKey?: string;
    geminiEndpoint?: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pmdb',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY || 'change-me-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY || 'change-me-in-production',
    accessTokenTTL: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTokenTTL: process.env.REFRESH_TOKEN_TTL || '30d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none') || 'strict',
  },
  logging: {
    filePath: process.env.LOG_FILE_PATH || './logs/audit.log',
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  passwordReset: {
    tokenTTL: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL || '3600000', 10),
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiEndpoint:
      process.env.GEMINI_API_ENDPOINT ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  },
};

// Validate critical configuration
if (config.env === 'production') {
  if (
    config.jwt.accessTokenSecret === 'change-me-in-production' ||
    config.jwt.refreshTokenSecret === 'change-me-in-production'
  ) {
    throw new Error('JWT secrets must be changed in production');
  }
  if (!config.cookie.secure) {
    console.warn('WARNING: Cookies should be secure in production');
  }
}

export default config;
