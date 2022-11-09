import { CronRepeatOptions, RepeatOptions } from "bull";

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
    host?: string;
    port?: number;
    db?: number;
    exec?: string;
    url?: string;
    password?: string;
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
  options: {
    yes?: boolean;
  };
};

export type AddParams = {
  data: string;
  options: {
    name?: string;
    jobId?: string;
    priority?: string;
    delay?: string;
    attempts?: string;
    repeat?: CronRepeatOptions | RepeatOptions;
    lifo?: boolean;
    yes?: boolean;
  };
};

export type RmParams = GetParams;
export type RetryParams = GetParams;

export type RetryFailedParams = {
  options: {
    number?: number;
    yes?: boolean;
  }
}

export type PromoteParams = GetParams;

export type FailParams = {
  jobId: string;
  reason: string;
  options: {
    yes?: boolean;
  }
};

export type CompleteParams = {
  jobId: string;
  data: string;
  options: {
    yes?: boolean;
  };
};

export type CleanParams = {
  period: string;
  options: {
    status?: "completed" | "wait" | "active" | "delayed" | "failed";
    limit?: number;
    yes?: boolean;
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
  options: {
    yes?: boolean;
  }
};

export type YesParams = {
  options: {
    yes?: boolean;
  }
}
