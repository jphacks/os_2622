import express, { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RegistrationError, validateCreateBotInput, type RegisteredBot } from './bot-registration.js';
import type { Account } from './db.js';

type Dependencies = {
  auth: RequestHandler;
  account(req: express.Request): Account;
  password(account: Account): string;
  register: (input: ReturnType<typeof validateCreateBotInput>, did: string) => Promise<RegisteredBot>;
  getBot: (did: string) => Promise<RegisteredBot['bot'] | null>;
};

/** Signed-in routes use server-side credentials, never a caller-supplied DID. */
export function createAccountBotsRouter(deps: Dependencies): Router {
  const router = Router();
  router.get('/me', deps.auth, async (req, res) => {
    res.json({ bot: await deps.getBot(deps.account(req).did) });
  });
  router.post('/', (req, res, next) => {
    // Preserve the existing standalone registration endpoint for other clients.
    if (!req.header('authorization')) { next('route'); return; }
    deps.auth(req, res, next);
  }, rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }), express.json({ limit: '20kb' }), async (req, res) => {
    const account = deps.account(req);
    const input = validateCreateBotInput({
      account: { identifier: account.did, appPassword: deps.password(account) },
      bot: req.body?.bot,
    });
    res.status(201).json(await deps.register(input, account.did));
  });
  router.use(((error, _req, res, _next) => {
    if (error instanceof RegistrationError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, fields: error.fields } });
      return;
    }
    const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
    if (type === 'entity.parse.failed' || type === 'entity.too.large') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '入力JSONの形式・サイズを確認してください。' } });
      return;
    }
    res.status(502).json({ error: { code: 'PDS_REQUEST_FAILED', message: 'ペット情報を処理できませんでした。時間をおいて再度お試しください。' } });
  }) as express.ErrorRequestHandler);
  return router;
}
