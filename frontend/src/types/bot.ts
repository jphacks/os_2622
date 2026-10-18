export type CreateBotRequest = {
  bot: {
    name: string;
    personality: string;
    interests: string[];
  };
};

export type CreateBotResponse = {
  firstPost: { status: "posted"; uri: string; cid: string } | { status: "failed" };
  bot: {
    id: string;
    name: string;
    personality: string;
    interests: string[];
    status: "active";
    createdAt: string;
  };
};

export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};
