export type JobAdditional = {
  failedReason: string;
  delay: number;
  _progress: number;
  data: object;
  returnvalue: object;
};

export type Answer = {
  a: "y" | "n";
};

export type ConnectParams = {
  queue: string;
  options: {
    prefix?: string;
    redis?: string;
    clientCert?: string;
    clientKey?: string;
    serverCert?: string;
  };
};

export type ActiveParams = {
  options: {
    filter?: string;
    timeAgo?: string;
  };
};
export type WaitingParams = ActiveParams;
export type CompletedParams = ActiveParams;
export type FailedParams = ActiveParams;
export type DelayedParams = ActiveParams;

export type GetParams = {
  jobId: string[];
};

export type AddParams = {
  data: string;
  options: {
    name?: string;
  };
};

export type RmParams = GetParams;
export type RetryParams = GetParams;
export type PromoteParams = GetParams;

export type FailParams = {
  jobId: string;
  reason: string;
};

export type CompleteParams = {
  jobId: string;
  data: string;
};

export type CleanParams = {
  period: string;
  options: {
    status?: "completed" | "wait" | "active" | "delayed" | "failed";
    limit?: number;
  };
};

export type LogsParams = {
  jobId: string;
  options: {
    start?: number;
    end?: number;
  };
};

export type LogParams = {
  jobId: string;
  data: string;
};

export type RedisTLSOptions = {
  clientKey: string;
  clientCert: string;
  serverCert: string;
};
