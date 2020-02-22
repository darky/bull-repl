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
  splitJobsByFound,
  wrapTryCatch,
  LAST_SAVED_CONNECTION_NAME
} from "./src/utils";
import { getQueue, connectToQueue } from "./src/queue";

export const vorpal = new Vorpal();
vorpal.localStorage("bull-repl-default");

export const localStorage = (vorpal.localStorage as unknown) as WindowLocalStorage["localStorage"] & {
  _localStorage: { keys: string[] };
};

vorpal
  .command("connect <queue>", "connect to bull queue")
  .option("--prefix <prefix>", "prefix to use for all queue jobs")
  .option("-h, --host <host>", "redis host for connection")
  .option("-p, --port <port>", "redis port for connection")
  .option("-d, --db <db>", "redis db for connection")
  .option("--password <password>", "redis password for connection")
  .option("-c, --cert <cert>", "absolute path to pem certificate if TLS used")
  .action(
    wrapTryCatch(async (params: ConnectParams) => {
      await connectToQueue(params, vorpal);
    })
  );

vorpal.command("connect-list", "list of saved connections").action(
  wrapTryCatch(async () => {
    console.table(localStorage._localStorage.keys);
  })
);

vorpal.command("connect-rm <name>", "remove saved connection").action(
  wrapTryCatch(async ({ name }: { name: string }) => {
    if (name === LAST_SAVED_CONNECTION_NAME) {
      return logYellow(`Can't use reserved name, please use another`);
    }
    const savedItem = localStorage.getItem(name);
    if (savedItem) {
      localStorage.removeItem(name);
      logGreen(`Connection "${name}" removed`);
    } else {
      logYellow(`Connection "${name}" not found`);
    }
  })
);

vorpal.command("connect-save <name>", "save current connection").action(
  wrapTryCatch(async ({ name: nameForSave }: { name: string }) => {
    if (nameForSave === LAST_SAVED_CONNECTION_NAME) {
      return logYellow(`Can't use reserved name, please use another`);
    }
    await getQueue();
    const options = JSON.parse(
      localStorage.getItem(LAST_SAVED_CONNECTION_NAME) as string
    ) as ConnectParams;
    localStorage.setItem(nameForSave, JSON.stringify(options));
    logGreen(`Connection "${nameForSave}" saved`);
  })
);

vorpal.command("connect-to <name>", "connect to saved connection").action(
  wrapTryCatch(async ({ name: connectToName }: { name: string }) => {
    const savedItem = localStorage.getItem(connectToName);
    if (!savedItem) {
      return logYellow(`Connection "${connectToName}" not found`);
    }
    const options: ConnectParams = JSON.parse(savedItem);
    await connectToQueue(options, vorpal);
  })
);

vorpal.command("stats", "count of jobs by groups").action(
  wrapTryCatch(async () => {
    const queue = await getQueue();
    const counts = await queue.getJobCounts(
      "completed",
      "failed",
      "delayed",
      "repeat",
      "active",
      "wait",
      "paused"
    );
    console.table(counts);
  })
);

vorpal
  .command("active", "fetch active jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: ActiveParams) => {
      const queue = await getQueue();
      const filter = await getFilter(options.filter);
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getActive(options.start || 0, options.end || 100), {
        ...filter,
        ...timeAgoFilter
      });
    })
  );

vorpal
  .command("waiting", "fetch waiting jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: WaitingParams) => {
      const queue = await getQueue();
      const filter = await getFilter(options.filter);
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getWaiting(options.start || 0, options.end || 100), {
        ...filter,
        ...timeAgoFilter
      });
    })
  );

vorpal
  .command("completed", "fetch completed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: CompletedParams) => {
      const queue = await getQueue();
      const filter = await getFilter(options.filter);
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(
        await queue.getCompleted(options.start || 0, options.end || 100),
        { ...filter, ...timeAgoFilter }
      );
    })
  );

vorpal
  .command("failed", "fetch failed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: FailedParams) => {
      const queue = await getQueue();
      const filter = await getFilter(options.filter);
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getFailed(options.start || 0, options.end || 100), {
        ...filter,
        ...timeAgoFilter
      });
    })
  );

vorpal
  .command("delayed", "fetch delayed jobs")
  .option("-f, --filter <filter>", `filter jobs via ${searchjsLink}`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: DelayedParams) => {
      const queue = await getQueue();
      const filter = await getFilter(options.filter);
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getDelayed(options.start || 0, options.end || 100), {
        ...filter,
        ...timeAgoFilter
      });
    })
  );

vorpal.command("pause", "pause current queue").action(
  wrapTryCatch(async () => {
    const queue = await getQueue();
    await answer(vorpal, "Pause queue");
    await queue.pause();
    logGreen(`Queue paused`);
  })
);

vorpal.command("resume", "resume current queue from pause").action(
  wrapTryCatch(async () => {
    const queue = await getQueue();
    await answer(vorpal, "Resume queue");
    await queue.resume();
    logGreen(`Queue resumed from pause`);
  })
);

vorpal.command("get <jobId...>", "get job").action(
  wrapTryCatch(async ({ jobId }: GetParams) => {
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && showJobs(foundJobs, {});
  })
);

vorpal
  .command("add <data>", "add job to queue")
  .option("-n, --name <name>", "name for named job")
  .action(
    wrapTryCatch(async function({ data, options }: AddParams) {
      const queue = await getQueue();
      let jobData: object;
      try {
        jobData = JSON.parse(data);
      } catch (e) {
        return throwYellow(`Error occured, seems "data" incorrect json`);
      }
      await answer(vorpal, "Add");
      const jobName: string = options.name || "__default__";
      const addedJob = await queue.add(jobName, jobData, {
        timestamp: Date.now()
      });
      logGreen(`Job with name '${jobName}', id '${addedJob.id}' added`);
    })
  );

vorpal.command("rm <jobId...>", "remove job").action(
  wrapTryCatch(async function({ jobId }: RmParams) {
    await answer(vorpal, "Remove");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.remove()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" removed`);
  })
);

vorpal.command("retry <jobId...>", "retry job").action(
  wrapTryCatch(async function({ jobId }: RetryParams) {
    await answer(vorpal, "Retry");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.retry()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" retried`);
  })
);

vorpal.command("retry-failed", "retry first 100 failed jobs").action(
  wrapTryCatch(async function() {
    const queue = await getQueue();
    await answer(vorpal, "Retry failed jobs");
    const failedJobs = await queue.getFailed(0, 100);
    await Promise.all(failedJobs.map(j => j.retry()));
    logGreen("All failed jobs retried");
  })
);

vorpal.command("promote <jobId...>", "promote job").action(
  wrapTryCatch(async function({ jobId }: PromoteParams) {
    await answer(vorpal, "Promote");
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    await Promise.all(foundJobs.map(j => j.promote()));
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" promoted`);
  })
);

vorpal.command("fail <jobId> <reason>", "fail job").action(
  wrapTryCatch(async function({ jobId, reason }: FailParams) {
    await getQueue();
    const job = await getJob(jobId);
    await answer(vorpal, "Fail");
    const err = new Error(reason);
    await job.moveToFailed(err, "0");
    logGreen(`Job "${jobId}" failed`);
  })
);

vorpal.command("complete <jobId> <data>", "complete job").action(
  wrapTryCatch(async function({ jobId, data }: CompleteParams) {
    await getQueue();
    const job = await getJob(jobId);
    let returnValue: string;
    try {
      returnValue = JSON.parse(data);
    } catch (e) {
      return throwYellow(`Error occured, seems "data" incorrect json`);
    }
    await answer(vorpal, "Complete");
    await job.moveToCompleted(returnValue, "0");
    logGreen(`Job "${jobId}" completed`);
  })
);

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
  .action(
    wrapTryCatch(async function({ period, options }: CleanParams) {
      const queue = await getQueue();
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
      await answer(vorpal, "Clean");
      const limit = Number.isInteger(options.limit as number)
        ? (options.limit as number)
        : 0;
      await queue.clean(grace, limit, status);
      logGreen(`Jobs cleaned`);
    })
  );

vorpal
  .command("logs <jobId>", "get logs of job")
  .option("-s, --start <start>", "Start of logs")
  .option("-e, --end <end>", "End of logs")
  .action(
    wrapTryCatch(async ({ jobId, options }: LogsParams) => {
      const queue = await getQueue();
      const { logs, count } = (await queue.getJobLogs(
        jobId,
        options.start,
        options.end
      )) as { logs: string[]; count: number };
      console.log(`Count of job logs: ${count}`);
      if (logs.length) {
        console.log("Logs:");
        logArray(logs);
      }
    })
  );

vorpal.command("log <jobId> <data>", "add log to job").action(
  wrapTryCatch(async function({ jobId, data }: LogParams) {
    await getQueue();
    const job = await getJob(jobId);
    await answer(vorpal, "Add log");
    await job.log(data);
    logGreen("Log added to job");
  })
);

vorpal.history("bull-repl-default");
vorpal.delimiter("BULL-REPL> ").show();
