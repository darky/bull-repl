/// <reference types="./typing" />

import type {
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
  LogParams,
  YesParams
} from "./src/types";
import Vorpal from "@moleculer/vorpal";
import ms from "ms";
import {
  showJobs,
  getTimeAgoFilter,
  jqLink,
  msLink,
  logArray,
  getJob,
  answer,
  logGreen,
  throwYellow,
  logYellow,
  splitJobsByFound,
  wrapTryCatch,
  LAST_SAVED_CONNECTION_NAME,
  getBootCommand
} from "./src/utils";
import { getQueue, connectToQueue, listenQueueEvents, unlistenQueueEvents } from "./src/queue";

export const vorpal = new Vorpal();
vorpal.localStorage("bull-repl-default");

export const localStorage = (vorpal.localStorage as unknown) as WindowLocalStorage["localStorage"] & {
  _localStorage: { _keys: string[] };
};

vorpal
  .command("connect <queue>", "Connect to bull queue")
  .option("--prefix <prefix>", "Prefix to use for all queue jobs")
  .option("-h, --host <host>", "Redis host for connection")
  .option("-p, --port <port>", "Redis port for connection")
  .option("-d, --db <db>", "Redis db for connection")
  .option("--password <password>", "Redis password for connection")
  .option("-c, --cert <cert>", "Absolute path to pem certificate if TLS used")
  .option("-u, --url <url>", "Redis sentinel format URL")
  .option("-e, --exec <exec>", "Exec command")
  .action(
    wrapTryCatch(async (params: ConnectParams) => {
      await connectToQueue(params, vorpal);
      if (params.options.exec) {
        process.nextTick(async () => {
          await vorpal.exec(params.options.exec!);
          await vorpal.exec('exit');
        });
      }
    })
  );

vorpal.command("connect-list", "List of saved connections").action(
  wrapTryCatch(async () => {
    console.table(localStorage._localStorage._keys);
  })
);

vorpal.command("connect-rm <name>", "Remove saved connection").action(
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

vorpal.command("connect-save <name>", "Save current connection").action(
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

vorpal.command("connect-to <name>", "Connect to saved connection").action(
  wrapTryCatch(async ({ name: connectToName }: { name: string }) => {
    const savedItem = localStorage.getItem(connectToName);
    if (!savedItem) {
      return logYellow(`Connection "${connectToName}" not found`);
    }
    const options: ConnectParams = JSON.parse(savedItem);
    await connectToQueue(options, vorpal);
  })
);

vorpal.command("stats", "Count of jobs by type").action(
  wrapTryCatch(async () => {
    const queue = await getQueue();
    const [counts, paused] = await Promise.all([
      queue.getJobCounts(),
      queue.getPausedCount()
    ]);
    console.table({ ...counts, ...{ paused } });
  })
);

vorpal
  .command("active", "Fetch active jobs")
  .option("-q, --query <query>", `Query jobs via jq - ${jqLink}. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'`)
  .option("-t, --timeAgo <timeAgo>", `Get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "Start index (pagination)")
  .option("-e, --end <end>", "End index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: ActiveParams) => {
      const queue = await getQueue();
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getActive(
        options.start || 0, options.end || 100),
        [timeAgoFilter, options.query].filter(v => v).join(' | '));
    })
  );

vorpal
  .command("waiting", "Fetch waiting jobs")
  .option("-q, --query <query>", `Query jobs via jq - ${jqLink}. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'`)
  .option("-t, --timeAgo <timeAgo>", `Get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "Start index (pagination)")
  .option("-e, --end <end>", "End index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: WaitingParams) => {
      const queue = await getQueue();
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getWaiting(
        options.start || 0, options.end || 100),
        [timeAgoFilter, options.query].filter(v => v).join(' | '));
    })
  );

vorpal
  .command("completed", "Fetch completed jobs")
  .option("-q, --query <query>", `Query jobs via jq - ${jqLink}. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'`)
  .option("-t, --timeAgo <timeAgo>", `Get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "Start index (pagination)")
  .option("-e, --end <end>", "End index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: CompletedParams) => {
      const queue = await getQueue();
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(
        await queue.getCompleted(options.start || 0, options.end || 100),
        [timeAgoFilter, options.query].filter(v => v).join(' | ')
      );
    })
  );

vorpal
  .command("failed", "Fetch failed jobs")
  .option("-q, --query <query>", `Query jobs via jq - ${jqLink}. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'`)
  .option("-t, --timeAgo <timeAgo>", `Get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "Start index (pagination)")
  .option("-e, --end <end>", "End index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: FailedParams) => {
      const queue = await getQueue();
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getFailed(options.start || 0, options.end || 100),
        [timeAgoFilter, options.query].filter(v => v).join(' | '));
    })
  );

vorpal
  .command("delayed", "Fetch delayed jobs")
  .option("-q, --query <query>", `Query jobs via jq - ${jqLink}. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'`)
  .option("-t, --timeAgo <timeAgo>", `get jobs since time ago via ${msLink}`)
  .option("-s, --start <start>", "start index (pagination)")
  .option("-e, --end <end>", "end index (pagination)")
  .action(
    wrapTryCatch(async ({ options }: DelayedParams) => {
      const queue = await getQueue();
      const timeAgoFilter = await getTimeAgoFilter(options.timeAgo);
      showJobs(await queue.getDelayed(options.start || 0, options.end || 100),
        [timeAgoFilter, options.query].filter(v => v).join(' | '));
    })
  );

vorpal
  .command("pause", "Pause current queue")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async ({ options }: YesParams) => {
      const queue = await getQueue();
      await answer(vorpal, "Pause queue", options.yes);
      await queue.pause(false);
      logGreen(`Queue paused`);
    })
  );

vorpal
  .command("resume", "Resume current queue from pause")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async ({ options }: YesParams) => {
      const queue = await getQueue();
      await answer(vorpal, "Resume queue", options.yes);
      await queue.resume(false);
      logGreen(`Queue resumed from pause`);
    })
  );

vorpal.command("get <jobId...>", "Get job").action(
  wrapTryCatch(async ({ jobId }: GetParams) => {
    const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
    notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
    foundJobs.length && showJobs(foundJobs, '');
  })
);

vorpal
  .command("add <data>", "Add job to queue e.g. add '{\"x\": 1}'")
  .option("-n, --name <name>", "name for named job")
  .option("--jobId <jobId>", "Override the job ID - by default")
  .option("--priority <priority>", "Optional priority value. ranges from 1 (highest priority) to MAX_INT  (lowest priority)")
  .option("--delay <delay>", "An amount of milliseconds to wait until this job can be processed")
  .option("--attempts <attempts>", "The total number of attempts to try the job until it completes")
  .option("--repeat <repeat>", "Repeat job according to a cron specificatio")
  .option("--lifo <lifo>", "if true, adds the job to the right of the queue instead of the left (default false)")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ data, options }: AddParams) {
      const queue = await getQueue();
      const {
        priority,
        repeat,
        jobId,
        delay = 0,
        attempts = 1,
        lifo = false,
      } = options;
      let opts = {
        jobId,
        priority,
        repeat,
        delay,
        attempts,
        lifo,
      };
      let jobData: object;
      let jobOptions: Record<string, any> = Object.fromEntries(
        Object.entries(opts)
          .filter(([, value]) => value !== undefined)
      );

      try {
        jobData = JSON.parse(data);
      } catch (e) {
        return throwYellow(`Error: Argument <data> is invalid: ${e}`);
      }

      if (repeat && typeof repeat === 'string') {
        try {
          jobOptions.repeat = JSON.parse(repeat);
        } catch (e) {
          return throwYellow(`Error: Argument <repeat> is invalid: ${e}`);
        }
      }

      await answer(vorpal, "Add", options.yes);
      const jobName: string = options.name || "__default__";
      const addedJob = await queue.add(jobName, jobData, jobOptions);
      logGreen(`Job with name '${jobName}', id '${addedJob.id}' added`);
    })
  );

vorpal
  .command("rm <jobId...>", "Remove job")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ jobId, options }: RmParams) {
      await answer(vorpal, "Remove", options.yes);
      const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
      await Promise.all(foundJobs.map(j => j.remove()));
      notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
      foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" removed`);
    })
  );

vorpal
  .command("retry <jobId...>", "Retry job")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ jobId, options }: RetryParams) {
      await answer(vorpal, "Retry", options.yes);
      const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
      await Promise.all(foundJobs.map(j => j.retry()));
      notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
      foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" retried`);
    })
  );

vorpal
  .command("retry-failed", "Retry first 100 failed jobs")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ options }: YesParams) {
      const queue = await getQueue();
      await answer(vorpal, "Retry failed jobs", options.yes);
      const failedJobs = await queue.getFailed(0, 100);
      await Promise.all(failedJobs.map(j => j.retry()));
      logGreen("All failed jobs retried");
    })
  );

vorpal
  .command("promote <jobId...>", "Promote job")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ jobId, options }: PromoteParams) {
      await answer(vorpal, "Promote", options.yes);
      const { notFoundIds, foundJobs } = await splitJobsByFound(jobId);
      await Promise.all(foundJobs.map(j => j.promote()));
      notFoundIds.length && logYellow(`Not found jobs: ${notFoundIds}`);
      foundJobs.length && logGreen(`Jobs "${foundJobs.map(j => j.id)}" promoted`);
    })
  );

vorpal
  .command("fail <jobId> <reason>", "Move job to failed")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ jobId, reason, options }: FailParams) {
      await getQueue();
      const job = await getJob(jobId);
      await answer(vorpal, "Fail", options.yes);
      await job.moveToFailed({ message: reason }, true);
      logGreen(`Job "${jobId}" failed`);
    })
  );

vorpal
  .command("complete <jobId> <data>", "Move job to completed e.g. complete 1 '{\"x\": 1}'")
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ jobId, data, options }: CompleteParams) {
      await getQueue();
      const job = await getJob(jobId);
      let returnValue: string;
      try {
        returnValue = JSON.parse(data);
      } catch (e) {
        return throwYellow(`Error: Argument <data> is invalid: ${e}`);
      }
      await answer(vorpal, "Complete", options.yes);
      await job.moveToCompleted(returnValue, true);
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
  .option(
    "-y, --yes",
    "Skip answer validation"
  )
  .action(
    wrapTryCatch(async function({ period, options }: CleanParams) {
      const types = ["completed", "wait", "active", "delayed", "failed"];
      const queue = await getQueue();
      const grace = period && period.length ? ms(period as string) : void 0;
      if (!grace) {
        return throwYellow("Incorrect period");
      }
      const status = options.status || "completed";
      if (
        !types.includes(status)
      ) {
        return throwYellow(
          `Unknown status, must be one of: ${types.join(", ")}`
        );
      }
      await answer(vorpal, "Clean", options.yes);
      const limit = Number.isInteger(options.limit as number)
        ? options.limit
        : void 0;
      await queue.clean(grace, status, limit);
      logGreen(`Jobs cleaned`);
    })
  );

vorpal
  .command("logs <jobId>", "Get logs of job")
  .option("-s, --start <start>", "Start of logs")
  .option("-e, --end <end>", "End of logs")
  .action(
    wrapTryCatch(async ({ jobId, options }: LogsParams) => {
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
    })
  );

vorpal
  .command("log <jobId> <data>", "Add log to job")
  .action(
    wrapTryCatch(async function({ jobId, data, options }: LogParams) {
      await getQueue();
      const job = await getJob(jobId);
      await answer(vorpal, "Add log", options.yes);
      await job.log(data);
      logGreen("Log added to job");
    })
  );

vorpal.command("events-on", "Turn on logging of queue events").action(
  wrapTryCatch(async function() {
    const queue = await getQueue();
    listenQueueEvents(queue);
    logGreen(`Logging of queue events enabled`);
  })
);

vorpal.command("events-off", "Turn off logging of queue events").action(
  wrapTryCatch(async function() {
    const queue = await getQueue();
    unlistenQueueEvents(queue);
    logGreen(`Logging of queue events disabled`);
  })
);

vorpal.history("bull-repl-default");

vorpal.delimiter("BULL-REPL> ").show();

const command = getBootCommand();
if (command) {
  vorpal.exec(command);
}
