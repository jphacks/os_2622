export type CreateBotRequest = {
  bot: {
    name: string;
    personality: string;
    interests: string[];
  };
};

type RegistrationPostResult = { status: "posted"; uri: string; cid: string } | { status: "failed" };

export type CreateBotResponse = {
  firstPost: RegistrationPostResult;
  additionalPost: RegistrationPostResult;
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
