import { timingSafeEqual } from 'node:crypto';
import express, { Router, type ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import env from './config.js';
import { PostReceiveError, receivePost } from './post-receive.js';

function hasValidInternalToken(value: string | undefined): boolean {
  if (!value || !env.POST_RECEIVE_TOKEN) return false;
  const received = Buffer.from(value);
  const expected = Buffer.from(env.POST_RECEIVE_TOKEN);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createPostReceiveRouter(): Router {
  const router = Router();

  router.post('/:did/posts', rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }), express.json({ limit: '2kb' }), async (req, res, next) => {
    try {
      if (!hasValidInternalToken(req.header('x-post-receive-token'))) {
        res.status(401).json({ error: 'Invalid internal post token' });
        return;
      }
      const did = typeof req.params.did === 'string' ? req.params.did : '';
      const result = await receivePost({ did, text: req.body?.text });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof PostReceiveError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Unexpected post receive error' });
  };
  router.use(handleError);
  return router;
}
