import { Queue, QueueOptions } from "bullmq";
import { throwYellow } from "./utils";
import IORedis from "ioredis";

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
