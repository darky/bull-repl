import Queue, { Queue as TQueue, QueueOptions } from "bull";
import { throwYellow, logGreen, LAST_SAVED_CONNECTION_NAME, logBlue, logYellow } from "./utils";
import { ConnectParams } from "./types";
import fs from "fs";
import Vorpal from "@moleculer/vorpal";
import redisUrlPlus from "redis-url-plus";

let queue: TQueue | void;
let listenEventsOn = false;

export async function getQueue() {
  if (!queue) {
    return throwYellow("Need connect before");
  }
  return await queue.isReady();
}

export async function setQueue(
  name: string,
  url: string,
  options: QueueOptions
) {
  queue && (await queue.close());
  queue = Queue(name, url, options);
  await queue.isReady();
}

export async function connectToQueue(
  { queue: name, options }: ConnectParams,
  vorpal: Vorpal
) {
  const prefix = options.prefix || "bull";
  const redisOptions = options.url ? redisUrlPlus(options.url) : {
    host: options.host || "localhost",
    port: options.port || 6379,
    db: options.db ?? 0,
    password: options.password || void 0,
    tls: options.cert
      ? {
        ca: fs.readFileSync(options.cert),
        rejectUnauthorized: false
      }
      : void 0,
  };

  await setQueue(name, "", {
    prefix,
    redis: redisOptions
  });
  (<WindowLocalStorage["localStorage"]>(<unknown>vorpal.localStorage)).setItem(
    LAST_SAVED_CONNECTION_NAME,
    JSON.stringify({
      queue: name,
      options
    } as ConnectParams)
  );
  logGreen(`Connected to ${redisOptions.host}:${redisOptions.port}, prefix: ${prefix}, queue: ${name}`);
  vorpal.delimiter(`BULL-REPL | ${prefix}.${name}> `).show();
}

export function listenQueueEvents(queue: TQueue) {
  if (listenEventsOn) {
    return;
  }
  queue.on('global:active', (jobId: unknown) => {
    logBlue(`A job with id ${jobId} has started`);
  });
  queue.on('global:completed', (jobId: unknown, result: unknown) => {
    logBlue(`A job ${jobId} successfully completed with result: ${result}`);
  });
  queue.on('global:drained', () => {
    logBlue('Queue has processed all the waiting jobs');
  });
  queue.on('global:failed', (jobId: unknown, err: unknown) => {
    logYellow(`A job ${jobId} failed with error ${err}`);
  });
  queue.on('global:paused', () => {
    logBlue('The queue has been paused');
  });
  queue.on('global:progress', (jobId: unknown, progress: unknown) => {
    logBlue(`A job ${jobId} progress was updated to ${progress}`);
  });
  queue.on('global:resumed', () => {
    logBlue('The queue has been resumed');
  });
  queue.on('global:stalled', (jobId: unknown) => {
    logYellow(`A job ${jobId} has been marked as stalled`);
  });
  queue.on('global:waiting', (jobId: unknown) => {
    logBlue(`A job ${jobId} is waiting to be processed`);
  });
  listenEventsOn = true;
}

export function unlistenQueueEvents(queue: TQueue) {
  queue.removeAllListeners('global:active');
  queue.removeAllListeners('global:completed');
  queue.removeAllListeners('global:drained');
  queue.removeAllListeners('global:failed');
  queue.removeAllListeners('global:paused');
  queue.removeAllListeners('global:progress');
  queue.removeAllListeners('global:resumed');
  queue.removeAllListeners('global:stalled');
  queue.removeAllListeners('global:waiting');
  listenEventsOn = false;
}
