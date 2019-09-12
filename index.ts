/// <reference types="./typing" />

import Queue, { Job, Queue as TQueue } from "bull";
import chalk from "chalk";
import Vorpal, { CommandInstance } from "vorpal";
import { matchArray } from "searchjs";

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
  console.dir(filteredData, {
    colors: true,
    depth: null,
    maxArrayLength: Infinity
  });
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
  .option("-f, --filter <filter>", "filter jobs via searchjs")
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    showJobs(await queue.getActive(), filter);
  });

vorpal
  .command("waiting", "fetch waiting jobs")
  .option("-f, --filter <filter>", "filter jobs via searchjs")
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    showJobs(await queue.getWaiting(), filter);
  });

vorpal
  .command("completed", "fetch completed jobs")
  .option("-f, --filter <filter>", "filter jobs via searchjs")
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    showJobs(await queue.getCompleted(), filter);
  });

vorpal
  .command("failed", "fetch failed jobs")
  .option("-f, --filter <filter>", "filter jobs via searchjs")
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    showJobs(await queue.getFailed(), filter);
  });

vorpal
  .command("delayed", "fetch delayed jobs")
  .option("-f, --filter <filter>", "filter jobs via searchjs")
  .action(async ({ options }) => {
    await checkQueue();
    const filter = await getFilter(options.filter);
    showJobs(await queue.getDelayed(), filter);
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
    if (options.name) {
      await queue.add(options.name, jobData);
      console.log(chalk.green(`Job with name '${options.name}' added`));
    } else {
      await queue.add(jobData);
      console.log(chalk.green(`Job added`));
    }
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

vorpal.history("bull-repl-default");
vorpal.delimiter("BULL-REPL> ").show();
