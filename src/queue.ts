import { Queue, QueueOptions } from "bullmq";
import { throwYellow, logGreen, LAST_SAVED_CONNECTION_NAM } from "./utils";
import IORedis from "ioredis";
import fs from "fs";
import Vorpal from "vorpal";

let queue: Queue | void;

export async function getQueue() {
  if (!queue) {
    return throwYellow("Need connect before");
  }
  await queue.waitUntilReady();
  return queue;
}

export async function setQueue(
  name: string,
  url: string,
  options: QueueOptions
) {
  queue && (await queue.close());
  const client = new IORedis(url);
  queue = new Queue(name, { connection: client, ...options });
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
  const tls = options.cert
    ? {
        ca: fs.readFileSync(options.cert),
        rejectUnauthorized: false
      }
    : {};
  await setQueue(name, "", {
    prefix,
    redis: {
      host,
      port,
      db,
      password,
      tls
    }
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
