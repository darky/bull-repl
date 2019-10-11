import Queue, { Queue as TQueue, QueueOptions } from "bull";
import { throwYellow } from "./utils";

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
