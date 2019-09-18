import Queue, { Queue as TQueue, QueueOptions } from "bull";
import chalk from "chalk";

let queue: TQueue | void;

export async function getQueue() {
  if (!queue) {
    let err = new Error();
    err.stack = chalk.yellow("Need connect before");
    throw err;
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
