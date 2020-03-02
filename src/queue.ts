import Queue, { Queue as TQueue, QueueOptions } from "bull";
import { throwYellow, logGreen, LAST_SAVED_CONNECTION_NAME } from "./utils";
import { ConnectParams } from "./types";
import fs from "fs";
import Vorpal from "vorpal";

let queue: TQueue | void;

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
  const host = options.host || "localhost";
  const port = options.port || 6379;
  const db = options.db ?? 0;
  const password = options.password || void 0;
  const tls = options.cert
    ? {
        ca: fs.readFileSync(options.cert),
        rejectUnauthorized: false
      }
    : void 0;
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
