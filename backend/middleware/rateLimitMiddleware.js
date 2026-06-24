const { errorResponse } = require('../utils/response');

/**
 * Lightweight in-memory request limiter for low-volume API entry points.
 * Deployments that run multiple Node instances should replace this store with a shared cache.
 */
const createRateLimiter = ({ windowMs, max }) => {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const record = requests.get(key);

    if (!record || now >= record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return errorResponse(res, 'Too many requests. Please try again later.', 429);
    }

    record.count += 1;
    return next();
  };
};

module.exports = createRateLimiter;
