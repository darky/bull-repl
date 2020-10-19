import { JobAdditional, Answer } from "./types";
import { Job } from "bullmq";
import { run } from "node-jq";
import chalk from "chalk";
import ms from "ms";
import { getQueue } from "./queue";
import Vorpal from "@moleculer/vorpal";

export const LAST_SAVED_CONNECTION_NAME = "_last-active";

export const getJob = async (jobId: string): Promise<Job<unknown, unknown>> => {
  const queue = await getQueue();
  const job = await queue.getJob(jobId);
  if (!job) {
    return throwYellow(`Job "${jobId}" not found`);
  }
  return job;
};

export const showJobs = async (arr: Array<Job>, query: string) => {
  const jobs = arr as Array<Job & JobAdditional>;
  const root = jobs
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
  const filteredData = query ? ((await run(query, {root}, {input: 'json', output: 'json'})) as unknown) : {root};
  logArray((<{root?: unknown}>filteredData)?.root ?? filteredData);
};

export const getTimeAgoFilter = (timeAgo?: string) => {
  return new Promise<string>(resolve => {
    try {
      const msAgo = timeAgo && timeAgo.length ? ms(timeAgo) : void 0;
      const filter = msAgo ? `{root: [.root[] | select((.timestamp | strptime("%Y-%m-%dT%H:%M:%S.%3Z") | mktime | . * 1000) >= ${Date.now() - msAgo})]}` : '';
      resolve(filter);
    } catch (e) {
      throwYellow(`Error: Argument to --timeAgo is invalid: ${e}`);
    }
  });
};

export const logArray = (arr: unknown) => {
  console.dir(arr, {
    colors: true,
    depth: null,
    maxArrayLength: Infinity,
  });
  Array.isArray(arr) && console.log(`count: ${chalk.yellow(arr.length)}`)
};

export const jqLink = "https://stedolan.github.io/jq/manual/#Basicfilters";
export const msLink = "https://github.com/zeit/ms#examples";

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

export const logBlue = (msg: string) => {
  console.log(chalk.blueBright(msg));
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

export function getBootCommand() {
  return process.argv.slice(2).join(' ');
}
