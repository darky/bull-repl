import Queue, { Job, Queue as TQueue } from 'bull';
import chalk from 'chalk';
import Vorpal from 'vorpal';
import { inspect } from 'util';

const vorpal = new Vorpal();
let queue: TQueue;

const showJobs = (arr: Array<Job>) => {
  const data = arr.map(job => ({
    id: job.id,
    data: job.data,
    time: new Date(job.timestamp).toISOString(),
    name: job.name,
    failedReason: (job as any).failedReason,
    stackTrace: job.stacktrace,
    returnValue: job.returnvalue,
    attemptsMade: job.attemptsMade,
    delay: (job as any).delay,
    progress: (job as any)._progress,
  }));
  console.table(data);
};

const checkQueue = async () => {
  if (!queue) {
    let err = new Error();
    err.stack = chalk.yellow('Need connect before');
    throw err;
  }
  return await queue.isReady();
};

const getJob = async (jobId: string) => {
  const job = await queue.getJob(jobId);
  if (!job) {
    let err = new Error();
    err.stack = chalk.yellow(`Job "${jobId}" not found`);
    throw err;
  }
  return job;
};

vorpal.command('connect <queue> [url]', 'connect to bull queue')
  .action(async ({ queue: name, url = 'redis://localhost:6379' }) => {
    queue && queue.close();
    queue = Queue(name, url);
    await queue.isReady();
    console.log(chalk.green(`Connected to ${url}, queue: ${name}`));
    vorpal.delimiter(`bull-repl@${name}$`).show();
  });

vorpal.command('stats', 'count of jobs by groups')
  .action(async () => {
    await checkQueue();
    console.table(await queue.getJobCounts());
  });

vorpal.command('active', 'fetch active jobs')
  .action(async () => {
    await checkQueue();
    showJobs(await queue.getActive());
  });

vorpal.command('waiting', 'fetch waiting jobs')
  .action(async () => {
    await checkQueue();
    showJobs(await queue.getWaiting());
  });

vorpal.command('completed', 'fetch completed jobs')
  .action(async () => {
    await checkQueue();
    showJobs(await queue.getCompleted());
  });

vorpal.command('failed', 'fetch failed jobs')
  .action(async () => {
    await checkQueue();
    showJobs(await queue.getFailed());
  });

vorpal.command('delayed', 'fetch delayed jobs')
  .action(async () => {
    await checkQueue();
    showJobs(await queue.getDelayed());
  });

vorpal.command('add <data>', 'add job to queue')
  .action(async ({ data }) => {
    await checkQueue();
    queue.add(JSON.parse(data));
  });

vorpal.command('rm <jobId>', 'remove job by id')
  .action(async ({ jobId }) => {
    await checkQueue();
    const job = await getJob(jobId);
    await job.remove();
    console.log(chalk.green(`Job "${jobId}" removed`));
  });

vorpal.command('retry <jobId>', 'retry job by id')
  .action(async ({ jobId }) => {
    await checkQueue();
    const job = await getJob(jobId);
    await job.retry();
    console.log(chalk.green(`Job "${jobId}" retried`));
  });

vorpal.delimiter('bull-repl$').show();
