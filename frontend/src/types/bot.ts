export type CreateBotRequest = {
  account: {
    identifier: string;
    appPassword: string;
  };
  bot: {
    name: string;
    personality: string;
    interests: string[];
  };
};

export type CreateBotResponse = {
  bot: {
    id: string;
    name: string;
    personality: string;
    interests: string[];
    status: "active";
    createdAt: string;
  };
  firstPost: {
    status: "queued" | "posted" | "failed";
  };
};

export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};
