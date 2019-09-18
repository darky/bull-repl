/// <reference types="./typing" />

import Queue, { Job, Queue as TQueue } from "bull";
import chalk from "chalk";
import Vorpal, { CommandInstance } from "vorpal";
import { matchArray } from "searchjs";
import terminalLink from "terminal-link";
import ms from "ms";

export const vorpal = new Vorpal();
let queue: TQueue;

const showJobs = (arr: Array<Job>, filter: object) => {
  const data = arr.map(job => ({
    id: job.id,
    data: job.data,
    time: Number.isNaN(job.timestamp) ? job.timestamp : new Date(job.timestamp),
    name: job.name,
    failedReason: (job as any).failedReason,
    stackTrace: job.stacktrace,
    returnValue: job.returnvalue,
    attemptsMade: job.attemptsMade,
    delay: (job as any).delay,
    progress: (job as any)._progress
  }));
  const filteredData = matchArray(data, filter);
  logArray(filteredData);
};

const checkQueue = async () => {
  if (!queue) {
    let err = new Error();
    err.stack = chalk.yellow("Need connect before");
    throw err;
  }
  return await queue.isReady();
};

const getJob = async (jobId: string) => {
  const job = await queue.getJob(jobId);
  if (!job) {
    let err = new Error();
    err.stack = chalk.yellow(`Job "${jobId}" not found`);
    throw err;
  }
  return job;
};

const getFilter = (filter?: string) => {
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

const getTimeAgoFilter = (timeAgo?: string) => {
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

const logArray = (arr: Array<unknown>) => {
  console.dir(arr, {
    colors: true,
    depth: null,
    maxArrayLength: Infinity
  });
};

const searchjsLink = terminalLink(
  "searchjs",
  "https://github.com/deitch/searchjs#examples"
);

const msLink = terminalLink("ms", "https://github.com/zeit/ms#examples");

vorpal
  .command("connect <queue>", "connect to bull queue")
  .option("-p, --prefix <prefix>", "prefix to use for all queue jobs")
  .option("-r, --redis <redis>", "host:port of redis, default localhost:6379")
  .action(async ({ queue: name, options }) => {
    queue && queue.close();
    const url = options.redis
      ? `redis://${options.redis}`
      : "redis://localhost:6379";
    queue = Queue(name, url, options);
    await queue.isReady();
    const prefix = options.prefix || "bull";
    console.log(
      chalk.green(`Connected to ${url}, prefix: ${prefix}, queue: ${name}`)
    );
    vorpal.delimiter(`BULL-REPL | ${prefix}.${name}> `).show();
  });

vorpal.command("stats", "count of jobs by groups").action(async () => {
  await checkQueue();
  console.table(await queue.getJobCounts());
});

vorpal
  .command("active", "fetch active jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getActive(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("waiting", "fetch waiting jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getWaiting(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("completed", "fetch completed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getCompleted(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("failed", "fetch failed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getFailed(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("delayed", "fetch delayed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getDelayed(), { ...filter, ...timeAgoFilter });
  });

vorpal.command("get <jobId>", "get job").action(async ({ jobId }) => {
  await checkQueue();
  const job = await getJob(jobId);
  showJobs([job], {});
});

vorpal
  .command("add <data>", "add job to queue")
  .option("-n, --name <name>", "name for named job")
  .action(async function(this: CommandInstance, { data, options }) {
    await checkQueue();
    let jobData;
    try {
      jobData = JSON.parse(data);
    } catch (e) {
      let err = new Error();
      err.stack = chalk.yellow(`Error occured, seems "data" incorrect json`);
      throw err;
    }
    const answer: any = await this.prompt({
      name: "a",
      message: "Add? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    const jobName: string = options.name || "__default__";
    const addedJob = await queue.add(jobName, jobData);
    console.log(
      chalk.green(`Job with name '${jobName}', id '${addedJob.id}' added`)
    );
  });

vorpal
  .command("rm <jobId>", "remove job")
  .action(async function(this: CommandInstance, { jobId }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({
      name: "a",
      message: "Remove? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    await job.remove();
    console.log(chalk.green(`Job "${jobId}" removed`));
  });

vorpal
  .command("retry <jobId>", "retry job")
  .action(async function(this: CommandInstance, { jobId }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({
      name: "a",
      message: "Retry? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    await job.retry();
    console.log(chalk.green(`Job "${jobId}" retried`));
  });

vorpal
  .command("promote <jobId>", "promote job")
  .action(async function(this: CommandInstance, { jobId }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({
      name: "a",
      message: "Promote? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    await job.promote();
    console.log(chalk.green(`Job "${jobId}" promoted`));
  });

vorpal
  .command("fail <jobId> <reason>", "fail job")
  .action(async function(this: CommandInstance, { jobId, reason }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({
      name: "a",
      message: "Fail? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    await job.moveToFailed({ message: reason }, true);
    console.log(chalk.green(`Job "${jobId}" failed`));
  });

vorpal
  .command("complete <jobId> <data>", "complete job")
  .action(async function(this: CommandInstance, { jobId, data }) {
    await checkQueue();
    const job = await getJob(jobId);
    let returnValue;
    try {
      returnValue = JSON.parse(data);
    } catch (e) {
      let err = new Error();
      err.stack = chalk.yellow(`Error occured, seems "data" incorrect json`);
      throw err;
    }
    const answer: any = await this.prompt({
      name: "a",
      message: "Complete? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    await job.moveToCompleted(returnValue, true);
    console.log(chalk.green(`Job "${jobId}" completed`));
  });

vorpal
  .command(
    "clean <period>",
    `Clean queue for period ago, period format - ${msLink}`
  )
  .option(
    "-s, --status <status>",
    "Status of the job to clean, default: completed"
  )
  .option(
    "-l, --limit <limit>",
    "Maximum amount of jobs to clean per call, default: all"
  )
  .action(async function(this: CommandInstance, { period, options }) {
    await checkQueue();
    const answer: any = await this.prompt({
      name: "a",
      message: "Clean? (y/n): "
    });
    if (answer.a !== "y") {
      return;
    }
    const grace = period && period.length ? ms(period as string) : void 0;
    if (!grace) {
      return console.log(chalk.yellow("Incorrect period"));
    }
    const status = options.status || "completed";
    if (
      !["completed", "wait", "active", "delayed", "failed"].includes(status)
    ) {
      return console.log(
        chalk.yellow(
          "Incorrect status, should be: completed or wait or active or delayed or failed"
        )
      );
    }
    const limit = Number.isInteger(options.limit) ? options.limit : void 0;
    await queue.clean(grace, status, limit);
    console.log(chalk.green(`Jobs cleaned`));
  });

vorpal
  .command("logs <jobId>", "get logs of job")
  .option("-s, --start <start>", "Start of logs")
  .option("-e, --end <end>", "End of logs")
  .action(async ({ jobId, options }) => {
    await checkQueue();
    const { logs, count } = await queue.getJobLogs(
      jobId,
      options.start,
      options.end
    );
    console.log(`Count of job logs: ${count}`);
    if (logs.length) {
      console.log("Logs:");
      logArray(logs);
    }
  });

vorpal
  .command("log <jobId> <data>", "add log to job")
  .action(async ({ jobId, data }) => {
    await checkQueue();
    const job = await getJob(jobId);
    await job.log(data);
    console.log(chalk.green("Log added to job"));
  });

vorpal.history("bull-repl-default");
vorpal.delimiter("BULL-REPL> ").show();
