import { JobAdditional } from "./types";
import { Job } from "bull";
import { matchArray } from "searchjs";
import chalk from "chalk";
import ms from "ms";
import terminalLink from "terminal-link";

export const showJobs = (arr: Array<Job>, filter: object) => {
  const jobs = arr as Array<Job & JobAdditional>;
  const data = jobs.map(job => ({
    id: job.id,
    data: (job as JobAdditional).data,
    time: Number.isNaN(job.timestamp) ? job.timestamp : new Date(job.timestamp),
    name: job.name,
    failedReason: job.failedReason,
    stackTrace: job.stacktrace,
    returnValue: (job as JobAdditional).returnvalue,
    attemptsMade: job.attemptsMade,
    delay: job.delay,
    progress: job._progress
  }));
  const filteredData = matchArray(data, filter);
  logArray(filteredData);
};

export const getFilter = (filter?: string) => {
  return new Promise<object>(resolve => {
    try {
      resolve(JSON.parse(filter || "{}"));
    } catch (e) {
      let err = new Error();
      err.stack = chalk.yellow(
        `Error occured, seems passed "filter" incorrect json`
      );
      throw err;
    }
  });
};

export const getTimeAgoFilter = (timeAgo?: string) => {
  return new Promise<object>(resolve => {
    try {
      const msAgo = timeAgo && timeAgo.length ? ms(timeAgo) : void 0;
      const filter = msAgo ? { time: { gte: Date.now() - msAgo } } : {};
      resolve(filter);
    } catch (e) {
      let err = new Error();
      err.stack = chalk.yellow(
        `Error occured, seems passed "timeAgo" incorrect`
      );
      throw err;
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
