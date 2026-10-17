import express, {Router, type ErrorRequestHandler} from 'express';
import {rateLimit} from 'express-rate-limit';
import {RegistrationError, validateCreateBotInput, type RegisteredBot, type ValidatedCreateBotInput} from './bot-registration.js';

export function createBotsRouter(register: (input: ValidatedCreateBotInput) => Promise<RegisteredBot>): Router {
  const router = Router();
  router.post('/', rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: {error: {code: 'RATE_LIMITED', message: '送信回数が多すぎます。時間をおいて再度お試しください。'}},
  }), express.json({limit: '20kb'}), async (req, res) => {
    const input = validateCreateBotInput(req.body);
    res.status(201).json(await register(input));
  });

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof RegistrationError) {
      res.status(error.status).json({error: {
        code: error.code, message: error.message,
        ...(error.fields ? {fields: error.fields} : {}),
      }});
      return;
    }
    const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
    if (type === 'entity.parse.failed' || type === 'entity.too.large' || type === 'encoding.unsupported' || type === 'charset.unsupported') {
      res.status(400).json({error: {code: 'VALIDATION_ERROR', message: '入力JSONの形式・サイズ・文字コードを確認してください。'}});
      return;
    }
    // Never expose/log upstream errors or parser bodies, which may contain secrets.
    res.status(500).json({error: {code: 'INTERNAL_ERROR', message: '登録処理に失敗しました。時間をおいて再度お試しください。'}});
  };
  router.use(handleError);
  return router;
}
