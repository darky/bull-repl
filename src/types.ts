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
    uri?: string;
    host?: string;
    port?: number;
    db?: number;
    username?: string;
    password?: string;
    acceptUnauthorized?: boolean;
    cert?: string;
  };
};

export type ActiveParams = {
  options: {
    query?: string;
    timeAgo?: string;
    start?: number;
    end?: number;
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
