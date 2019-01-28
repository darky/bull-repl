import Queue, { Job, Queue as TQueue } from 'bull';
import chalk from 'chalk';
import { table } from 'table';
import Vorpal, { CommandInstance } from 'vorpal';
import { inspect } from 'util';

const vorpal = new Vorpal();
let queue: TQueue;

const showJobs = (jobs: Array<Job>) => {
  const data = ([] as Array<string[]>)
    .concat([[
      chalk.green('id'),
      chalk.green('data'),
      chalk.green('time'),
      chalk.green('name'),
      chalk.green('failedReason'),
      chalk.green('stacktrace'),
      chalk.green('returnValue'),
      chalk.green('attemptsMade'),
      chalk.green('delay'),
      chalk.green('progress'),
    ]])
    .concat(
      jobs
        .map(job => ([
          job.id,
          job.data,
          new Date(job.timestamp).toISOString(),
          job.name,
          (job as any).failedReason,
          job.stacktrace,
          job.returnvalue,
          job.attemptsMade,
          (job as any).delay,
          (job as any)._progress,
        ]))
        .map(arr => arr.map(cell => inspect(cell, {colors: true, depth: null})))
    );
  console.log(table(data, {
    columns: {
      0: {width: 5},
      1: {width: 20},
      2: {width: 20},
      3: {width: 20},
      4: {width: 20},
      5: {width: 20},
      6: {width: 20},
      7: {width: 4},
      8: {width: 4},
      9: {width: 4},
    }
  }));
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
    vorpal.delimiter(`BULL-REPL | ${name}> `).show();
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
  .action(async function (this: CommandInstance, { data }) {
    await checkQueue();
    let jobData;
    try {
      jobData = JSON.parse(data);
    } catch(e) {
      let err = new Error();
      err.stack = chalk.yellow(`Error occured, seems "data" incorrect json`);
      throw err;
    }
    const answer: any = await this.prompt({ name: 'a', message: 'Complete? (y/n): ' });
    if (answer.a !== 'y') { return; }
    await queue.add(jobData);
    console.log(chalk.green(`Job added`));
  });

vorpal.command('rm <jobId>', 'remove job')
  .action(async function (this: CommandInstance, { jobId }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({ name: 'a', message: 'Remove? (y/n): ' });
    if (answer.a !== 'y') { return; }
    await job.remove();
    console.log(chalk.green(`Job "${jobId}" removed`));
  });

vorpal.command('retry <jobId>', 'retry job')
  .action(async function (this: CommandInstance, { jobId }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({ name: 'a', message: 'Retry? (y/n): ' });
    if (answer.a !== 'y') { return; }
    await job.retry();
    console.log(chalk.green(`Job "${jobId}" retried`));
  });

vorpal.command('fail <jobId> <reason>', 'fail job')
  .action(async function (this: CommandInstance, { jobId, reason }) {
    await checkQueue();
    const job = await getJob(jobId);
    const answer: any = await this.prompt({ name: 'a', message: 'Fail? (y/n): ' });
    if (answer.a !== 'y') { return; }
    await job.moveToFailed({message: reason}, true);
    console.log(chalk.green(`Job "${jobId}" failed`));
  });

vorpal.command('complete <jobId> <data>', 'complete job')
  .action(async function (this: CommandInstance, { jobId, data }) {
    await checkQueue();
    const job = await getJob(jobId);
    let returnValue;
    try {
      returnValue = JSON.parse(data);
    } catch(e) {
      let err = new Error();
      err.stack = chalk.yellow(`Error occured, seems "data" incorrect json`);
      throw err;
    }
    const answer: any = await this.prompt({ name: 'a', message: 'Complete? (y/n): ' });
    if (answer.a !== 'y') { return; }
    await job.moveToCompleted(returnValue, true);
    console.log(chalk.green(`Job "${jobId}" completed`));
  });

vorpal.delimiter('BULL-REPL> ').show();
