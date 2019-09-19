/// <reference types="./typing" />

import {
  ConnectParams,
  ActiveParams,
  WaitingParams,
  CompletedParams,
  FailedParams,
  DelayedParams,
  GetParams,
  AddParams,
  RmParams,
  RetryParams,
  PromoteParams,
  FailParams,
  CompleteParams,
  CleanParams,
  LogsParams,
  LogParams
} from "./src/types";
import Vorpal from "vorpal";
import ms from "ms";
import {
  showJobs,
  getFilter,
  getTimeAgoFilter,
  searchjsLink,
  msLink,
  logArray,
  getJob,
  answer,
  logGreen,
  throwYellow,
  logYellow,
  splitJobsByFound
} from "./src/utils";
import { getQueue, setQueue } from "./src/queue";

export const vorpal = new Vorpal();

vorpal
  .command("connect <queue>", "connect to bull queue")
  .option("-p, --prefix <prefix>", "prefix to use for all queue jobs")
  .option("-r, --redis <redis>", "host:port of redis, default localhost:6379")
  .action((async ({ queue: name, options }: ConnectParams) => {
    const url = options.redis
      ? `redis://${options.redis}`
      : "redis://localhost:6379";
    const prefix = options.prefix || "bull";
    await setQueue(name, url, { prefix });
    logGreen(`Connected to ${url}, prefix: ${prefix}, queue: ${name}`);
    vorpal.delimiter(`BULL-REPL | ${prefix}.${name}> `).show();
  }) as any);

vorpal.command("stats", "count of jobs by groups").action(async () => {
  const queue = await getQueue();
  console.table(await queue.getJobCounts());
});

vorpal
  .command("active", "fetch active jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }: ActiveParams) => {
    const queue = await getQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getActive(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("waiting", "fetch waiting jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }: WaitingParams) => {
    const queue = await getQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getWaiting(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("completed", "fetch completed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }: CompletedParams) => {
    const queue = await getQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getCompleted(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("failed", "fetch failed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }: FailedParams) => {
    const queue = await getQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getFailed(), { ...filter, ...timeAgoFilter });
  });

vorpal
  .command("delayed", "fetch delayed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-ta, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .action(async ({ options }: DelayedParams) => {
    const queue = await getQueue();
    const filter = await getFilter(options.filter);
    const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
    showJobs(await queue.getDelayed(), { ...filter, ...timeAgoFilter });
  });

vorpal.command("get <jobId...>", "get job").action((async ({
  jobId
}: GetParams) => {
  const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
  notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
  foundJobs.length && showJobs(foundJobs, {});
}) as any);

vorpal
  .command("add <data>", "add job to queue")
  .option("-n, --name <name>", "name for named job")
  .action(async function({ data, options }: AddParams) {
    const queue = await getQueue();
    let jobData: object;
    try {
      jobData = JSON.parse(data);
    } catch (e) {
      return throwYellow(`Error occured, seems "data" incorrect json`);
    }
    await answer(vorpal, "Add");
    const jobName: string = options.name || "__default__";
    const addedJob = await queue.add(jobName, jobData);
    logGreen(`Job with name '${jobName}', id '${addedJob.id}' added`);
  } as any);

vorpal
  .command("rm <jobId...>", "remove job")
  .action(async function({ jobId }: RmParams) {
    await answer(vorpal, "Remove");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.remove()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" removed`);
  } as any);

vorpal
  .command("retry <jobId...>", "retry job")
  .action(async function({ jobId }: RetryParams) {
    await answer(vorpal, "Retry");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.retry()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" retried`);
  } as any);

vorpal
  .command("promote <jobId...>", "promote job")
  .action(async function({ jobId }: PromoteParams) {
    await answer(vorpal, "Promote");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.promote()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" promoted`);
  } as any);

vorpal
  .command("fail <jobId> <reason>", "fail job")
  .action(async function({ jobId, reason }: FailParams) {
    await getQueue();
    const job = await getJob(jobId);
    await answer(vorpal, "Fail");
    await job.moveToFailed({ message: reason }, true);
    logGreen(`Job "${jobId}" failed`);
  } as any);

vorpal
  .command("complete <jobId> <data>", "complete job")
  .action(async function({ jobId, data }: CompleteParams) {
    await getQueue();
    const job = await getJob(jobId);
    let returnValue: string;
    try {
      returnValue = JSON.parse(data);
    } catch (e) {
      return throwYellow(`Error occured, seems "data" incorrect json`);
    }
    await answer(vorpal, "Complete");
    await job.moveToCompleted(returnValue, true);
    logGreen(`Job "${jobId}" completed`);
  } as any);

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
  .action(async function({ period, options }: CleanParams) {
    const queue = await getQueue();
    await answer(vorpal, "Clean");
    const grace = period && period.length ? ms(period as string) : void 0;
    if (!grace) {
      return throwYellow("Incorrect period");
    }
    const status = options.status || "completed";
    if (
      !["completed", "wait", "active", "delayed", "failed"].includes(status)
    ) {
      return throwYellow(
        "Incorrect status, should be: completed or wait or active or delayed or failed"
      );
    }
    const limit = Number.isInteger(options.limit as number)
      ? options.limit
      : void 0;
    await queue.clean(grace, status, limit);
    logGreen(`Jobs cleaned`);
  } as any);

vorpal
  .command("logs <jobId>", "get logs of job")
  .option("-s, --start <start>", "Start of logs")
  .option("-e, --end <end>", "End of logs")
  .action((async ({ jobId, options }: LogsParams) => {
    const queue = await getQueue();
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
  }) as any);

vorpal
  .command("log <jobId> <data>", "add log to job")
  .action(async function({ jobId, data }: LogParams) {
    await getQueue();
    const job = await getJob(jobId);
    await answer(vorpal, "Add log");
    await job.log(data);
    logGreen("Log added to job");
  } as any);

vorpal.history("bull-repl-default");
vorpal.delimiter("BULL-REPL> ").show();
