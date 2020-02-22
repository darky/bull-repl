import { JobAdditional, Answer } from "./types";
import { Job } from "bullmq";
import { matchArray } from "searchjs";
import chalk from "chalk";
import ms from "ms";
import terminalLink from "terminal-link";
import { getQueue } from "./queue";
import Vorpal from "vorpal";

export const getJob = async (jobId: string): Promise<Job<unknown, unknown>> => {
  const queue = await getQueue();
  const job = await queue.getJob(jobId);
  if (!job) {
    return throwYellow(`Job "${jobId}" not found`);
  }
  return job;
};

export const showJobs = (arr: Array<Job>, filter: object) => {
  const jobs = arr as Array<Job & JobAdditional>;
  const data = jobs
    .filter(j => j)
    .map(job => ({
      id: job.id,
      data: (job as JobAdditional).data,
      timestamp: Number.isNaN(job.timestamp)
        ? job.timestamp
        : new Date(job.timestamp),
      processedOn: job.processedOn && new Date(job.processedOn),
      finishedOn: job.finishedOn && new Date(job.finishedOn),
      name: job.name,
      failedReason: job.failedReason,
      stackTrace: job.stacktrace,
      returnValue: (job as JobAdditional).returnvalue,
      attemptsMade: job.attemptsMade,
      delay: job.delay,
      progress: job.progress
    }));
  const filteredData = matchArray(data, filter);
  logArray(filteredData);
};

export const getFilter = (filter?: string) => {
  return new Promise<object>(resolve => {
    try {
      resolve(JSON.parse(filter || "{}"));
    } catch (e) {
      throwYellow(`Error occured, seems passed "filter" incorrect json`);
    }
  });
};

export const getTimeAgoFilter = (timeAgo?: string) => {
  return new Promise<object>(resolve => {
    try {
      const msAgo = timeAgo && timeAgo.length ? ms(timeAgo) : void 0;
      const filter = msAgo ? { timestamp: { gte: Date.now() - msAgo } } : {};
      resolve(filter);
    } catch (e) {
      throwYellow(`Error occured, seems passed "timeAgo" incorrect`);
    }
  });
};

export const logArray = (arr: Array<unknown>) => {
  console.dir(arr, {
    colors: true,
    depth: null,
    maxArrayLength: Infinity
  });
};

export const searchjsLink = terminalLink(
  "searchjs",
  "https://github.com/deitch/searchjs#examples"
);

export const msLink = terminalLink("ms", "https://github.com/zeit/ms#examples");

export const answer = async (vorpal: Vorpal, question: string) => {
  const answer = (await vorpal.activeCommand.prompt({
    name: "a",
    message: `${question}? (y/n): `
  })) as Answer;
  if (answer.a !== "y") {
    throwYellow("You cancel action");
  }
};

export const logGreen = (msg: string) => {
  console.log(chalk.green(msg));
};

export const logYellow = (msg: string) => {
  console.log(chalk.yellow(msg));
};

export const throwYellow = (msg: string): never => {
  let err = new Error();
  ((err as unknown) as { yellow: boolean }).yellow = true;
  err.stack = chalk.yellow(msg);
  throw err;
};

export async function splitJobsByFound(jobIds: string[]) {
  const queue = await getQueue();
  const jobs = await Promise.all(jobIds.map(id => queue.getJob(id)));
  let notFoundIds = [] as string[];
  let foundJobs = [] as Job[];
  let i = 0;
  for (const jobId of jobIds) {
    const job = jobs[i];
    if (job) {
      foundJobs.push(job);
    } else {
      notFoundIds.push(jobId);
    }
    i++;
  }
  return { notFoundIds, foundJobs };
}

export function wrapTryCatch(fn: Function) {
  return async function(this: unknown, args: unknown) {
    try {
      return await fn.call(this, args);
    } catch (e) {
      if (e.yellow) {
        throw e;
      }
      return throwYellow(e.message);
    }
  };
}
