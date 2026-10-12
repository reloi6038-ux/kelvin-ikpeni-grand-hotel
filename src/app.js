/**
 * =============================================================
 * The Kelvin Ikpeni Grand Hotel — Express Application Entry
 * Compatible with Express 4.x AND Express 5.x
 * =============================================================
 * Wires together:
 *  - Trust proxy (required for Render / Heroku rate limiting)
 *  - Security middleware (helmet, cors, rate-limit)
 *  - Body parsers (json, urlencoded)
 *  - Logging (morgan)
 *  - Static asset serving with cache headers
 *  - All API route groups:
 *      auth, rooms, bookings, contact, reviews, admin,
 *      offers, newsletter, site-info, spa
 *  - Health check endpoint
 *  - JSON 404 for unmatched /api/* routes
 *  - SPA-style fallback for non-API GET requests
 *  - Centralized error handling
 *  - Process-level safety nets
 * =============================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

/* ---------------------------------------------------------------
 * Trust proxy — required for Render / Heroku / any reverse proxy
 * so that express-rate-limit sees the real client IP via
 * X-Forwarded-For. Without this, all requests appear to come
 * from the proxy and rate limiting behaves incorrectly.
 * --------------------------------------------------------------- */
app.set('trust proxy', 1);

/* ---------------------------------------------------------------
 * Security headers
 * CSP is disabled because we load Google Fonts, Unsplash images
 * and embed a Google Maps iframe. If you want a strict CSP, set
 * `contentSecurityPolicy` to a custom directives object instead
 * of `false`.
 * --------------------------------------------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ---------------------------------------------------------------
 * CORS — open by default. Restrict in production if you add
 * separate front-end origins. Same-origin requests from our own
 * static HTML files are unaffected.
 * --------------------------------------------------------------- */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* ---------------------------------------------------------------
 * Body parsers
 * --------------------------------------------------------------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ---------------------------------------------------------------
 * Logging
 *  - development → concise colored output
 *  - production  → combined (Apache-style) for log aggregation
 * --------------------------------------------------------------- */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/* ---------------------------------------------------------------
 * Rate limiting — applied to all /api routes.
 * 200 requests per 15-minute window per IP.
 * --------------------------------------------------------------- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});
app.use('/api', apiLimiter);

/* ---------------------------------------------------------------
 * Stricter rate limiters for sensitive endpoints
 * (auth login + newsletter subscription)
 * --------------------------------------------------------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in a few minutes.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/newsletter', authLimiter);

/* ---------------------------------------------------------------
 * Static assets — served from /public
 *
 * Two mount points:
 *  1. /images  → long cache (30 days, immutable) for photos
 *  2. /        → short cache (1 day) for HTML/CSS/JS
 *
 * HTML files get revalidation headers so that deployments are
 * reflected instantly without users clearing cache.
 * --------------------------------------------------------------- */
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Long-lived cache for static media
app.use(
  '/images',
  express.static(path.join(PUBLIC_DIR, 'images'), {
    maxAge: '30d',
    immutable: true,
    fallthrough: true,
  })
);

// General static serving for HTML, CSS, JS, favicon, etc.
app.use(
  express.static(PUBLIC_DIR, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    },
  })
);

/* ---------------------------------------------------------------
 * API Routes
 * All handlers are protected where necessary via the `protect`
 * middleware defined in src/middleware/auth.js
 * --------------------------------------------------------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/site-info', require('./routes/siteInfo'));
app.use('/api/spa', require('./routes/spa'));                 // NEW — Serenity Spa

/* ---------------------------------------------------------------
 * Health check — used by Render for zero-downtime deployments
 * and by external uptime monitors.
 * --------------------------------------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'The Kelvin Ikpeni Grand Hotel API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    expressVersion: require('express/package.json').version,
    nodeVersion: process.version,
  });
});

/* ---------------------------------------------------------------
 * 404 handler for unmatched API routes.
 *
 * Uses a RegExp literal (not string '/api/*') because Express 5's
 * stricter path-to-regexp engine rejects bare asterisks.
 * --------------------------------------------------------------- */
app.all(/^\/api\/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ---------------------------------------------------------------
 * SPA-style fallback for non-API GET requests.
 *
 * Behaviour:
 *  - If the requested path corresponds to a real file in /public,
 *    serve it (express.static above already handles this; this
 *    block is a fallback safeguard).
 *  - Otherwise, serve index.html so client-side routes don't 404.
 *  - If index.html is missing, respond with 404.
 *  - Directory traversal is prevented by an explicit prefix check.
 * --------------------------------------------------------------- */
app.get(/^\/(?!api).*/, (req, res) => {
  const requestedPath = path.join(PUBLIC_DIR, req.path);

  // Prevent directory traversal
  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    return res.status(403).send('Forbidden');
  }

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isFile()) {
      return res.sendFile(requestedPath);
    }

    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    fs.access(indexPath, fs.constants.F_OK, (accessErr) => {
      if (accessErr) {
        return res.status(404).send('Not Found');
      }
      res.sendFile(indexPath);
    });
  });
});

/* ---------------------------------------------------------------
 * Centralized error handling
 * (must be LAST — after all routes and static middleware)
 * --------------------------------------------------------------- */
app.use(notFound);
app.use(errorHandler);

/* ---------------------------------------------------------------
 * Process-level safety nets
 * Logs unhandled promise rejections and uncaught exceptions so
 * they surface in Render's log stream instead of crashing silently.
 * --------------------------------------------------------------- */
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

module.exports = app;