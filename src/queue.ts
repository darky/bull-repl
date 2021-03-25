import { Queue, QueueEvents } from "bullmq";
import { throwYellow, logGreen, LAST_SAVED_CONNECTION_NAME, logBlue, logYellow } from "./utils";
import IORedis from "ioredis";
import fs from "fs";
import Vorpal from "@moleculer/vorpal";
import { ConnectParams } from "./types";

let queue: Queue | void;
let queueEvents: QueueEvents | void;

export async function getQueue() {
  if (!queue) {
    return throwYellow("Need connect before");
  }
  await queue.waitUntilReady();
  return queue;
}

export async function setQueue(
  name: string,
  prefix: string,
  options: string | IORedis.RedisOptions
) {
  unlistenQueueEvents();
  queue && (await queue.close());
  const client = new IORedis(options as any);
  queue = new Queue(name, { connection: client, ...{ prefix } });
  await queue.waitUntilReady();
  return queue;
}

export async function connectToQueue(
  { queue: name, options }: ConnectParams,
  vorpal: Vorpal
) {
  const prefix = options.prefix || "bull";
  const host = options.host || "localhost";
  const port = options.port || 6379;
  const db = options.db ?? 0;
  const password = options.password || void 0;
  let tls;
  if (options.acceptUnauthorized) {
    tls = { rejectUnauthorized: false };
  } else if (options.cert) {
    tls = {
      ca: fs.readFileSync(options.cert),
      rejectUnauthorized: false
    };
  } else {
    tls = void 0;
  }

  await setQueue(name, prefix, options.uri || {
    host,
    port,
    db,
    password,
    tls
  });
  (<WindowLocalStorage["localStorage"]>(<unknown>vorpal.localStorage)).setItem(
    LAST_SAVED_CONNECTION_NAME,
    JSON.stringify({
      queue: name,
      options
    } as ConnectParams)
  );
  logGreen(`Connected to ${host}:${port}, prefix: ${prefix}, queue: ${name}`);
  vorpal.delimiter(`BULL-REPL | ${prefix}.${name}> `).show();
}

export function listenQueueEvents(queue: Queue) {
  if (queueEvents) {
    return;
  }
  queueEvents = new QueueEvents(queue.name);
  queueEvents.on('completed', (job) => {
    logBlue(`A job ${job.jobId} successfully completed with result: ${job.returnvalue}`);
  });
  queueEvents.on('delayed', (job) => {
    logBlue(`A job ${job.jobId} delayed with delay ${job.delay}`);
  });
  queueEvents.on('drained', () => {
    logBlue('Queue has processed all the waiting jobs');
  });
  queueEvents.on('failed', (job) => {
    logYellow(`A job ${job.jobId} failed with error ${job.failedReason}`);
  });
  queueEvents.on('progress', (job, progress) => {
    logBlue(`A job ${job.jobId} progress was updated to ${progress}`);
  });
  queueEvents.on('removed', (job) => {
    logBlue(`A job ${job.jobId} was removed`);
  });
  queueEvents.on('stalled', (job) => {
    logYellow(`A job ${job.jobId} has been marked as stalled`);
  });
  queueEvents.on('waiting', (job) => {
    logBlue(`A job ${job.jobId} is waiting to be processed`);
  });
}

export function unlistenQueueEvents() {
  if (!queueEvents) {
    return;
  }
  queueEvents.removeAllListeners();
  queueEvents = void 0;
}
