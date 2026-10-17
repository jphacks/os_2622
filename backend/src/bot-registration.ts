import type { AtpSessionData } from '@atproto/api';

export type CreateBotInput = {
  account: { identifier: string; appPassword: string };
  bot: { name: string; personality: string; interests: string[] };
};

export type ValidatedCreateBotInput = CreateBotInput;

export type RegisteredBot = {
  bot: ValidatedCreateBotInput['bot'] & { id: string; status: 'active'; createdAt: string };
};

export type RegistrationAccount = {did: string; handle: string; pdsUrl: string; session: AtpSessionData};

export type RegistrationDependencies<Account extends RegistrationAccount = RegistrationAccount> = {
  authenticate(identifier: string, appPassword: string): Promise<Account>;
  isRegistered(did: string): boolean;
  createProfile(account: Account, profile: ValidatedCreateBotInput['bot']): Promise<string>;
  saveAccount(input: RegistrationAccount & {profileUri: string; createdAt: string}): void;
  onSaved?(account: Account): void;
  now(): Date;
};

export class RegistrationError extends Error {
  constructor(
    readonly status: 400 | 401 | 409 | 500 | 502,
    readonly code: 'VALIDATION_ERROR' | 'ACCOUNT_AUTH_FAILED' | 'ACCOUNT_ALREADY_REGISTERED' | 'PDS_REQUEST_FAILED' | 'INTERNAL_ERROR',
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function validateCreateBotInput(value: unknown): ValidatedCreateBotInput {
  const fields: Record<string, string> = {};
  const root = isObject(value) ? value : {};
  const account = isObject(root.account) ? root.account : {};
  const bot = isObject(root.bot) ? root.bot : {};

  const identifier = typeof account.identifier === 'string' ? account.identifier.trim() : '';
  const appPassword = typeof account.appPassword === 'string' ? account.appPassword : '';
  const name = typeof bot.name === 'string' ? bot.name.trim() : '';
  const personality = typeof bot.personality === 'string' ? bot.personality.trim() : '';

  if (!identifier) fields.identifier = 'identifierを入力してください。';
  if (typeof account.appPassword !== 'string' || !appPassword.trim()) fields.appPassword = 'アプリパスワードを入力してください。';
  if (!name) fields.name = '名前を入力してください。';
  else if (name.length > 30) fields.name = '名前は30文字以内で入力してください。';
  if (!personality) fields.personality = '性格を入力してください。';
  else if (personality.length > 500) fields.personality = '性格は500文字以内で入力してください。';

  let interests: string[] = [];
  if (!Array.isArray(bot.interests) || bot.interests.some((item) => typeof item !== 'string')) {
    fields.interests = '興味・関心を文字列の配列で入力してください。';
  } else {
    interests = bot.interests.map((item) => item.trim());
    if (interests.length < 1 || interests.length > 10) {
      fields.interests = '興味・関心は1〜10件で入力してください。';
    } else if (interests.some((item) => item.length < 1 || item.length > 50)) {
      fields.interests = '興味・関心は各50文字以内の空でない文字列にしてください。';
    } else if (new Set(interests.map((item) => item.toLowerCase())).size !== interests.length) {
      fields.interests = '興味・関心に重複があります。';
    }
  }

  if (Object.keys(fields).length) {
    throw new RegistrationError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', fields);
  }
  return { account: { identifier, appPassword }, bot: { name, personality, interests } };
}

export async function registerBot<Account extends RegistrationAccount>(input: ValidatedCreateBotInput, dependencies: RegistrationDependencies<Account>): Promise<RegisteredBot> {
  const account = await dependencies.authenticate(input.account.identifier, input.account.appPassword);
  if (dependencies.isRegistered(account.did)) {
    throw new RegistrationError(409, 'ACCOUNT_ALREADY_REGISTERED', 'このアカウントは既に登録されています。');
  }
  const profileUri = await dependencies.createProfile(account, input.bot);
  const createdAt = dependencies.now().toISOString();
  try {
    dependencies.saveAccount({did: account.did, handle: account.handle, pdsUrl: account.pdsUrl, session: account.session, profileUri, createdAt});
    dependencies.onSaved?.(account);
  } catch {
    throw new RegistrationError(500, 'INTERNAL_ERROR', 'ペット設定をローカルに保存できませんでした。管理者にお問い合わせください。');
  }
  return {bot: {id: account.did, ...input.bot, status: 'active', createdAt}};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
