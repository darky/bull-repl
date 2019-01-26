import Queue from 'bull';
import { Queue as TQueue } from 'bull';
import chalk from 'chalk';
import Vorpal from 'vorpal';
import { inspect } from 'util';

const vorpal = new Vorpal();
let queue: TQueue;

const deepLog = (arr: Array<object>) => {
  console.log(inspect(arr, { colors: true }));
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
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    console.table(await queue.getJobCounts());
  });

vorpal.command('active', 'fetch active jobs')
  .action(async () => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    deepLog(await queue.getActive());
  });

vorpal.command('waiting', 'fetch waiting jobs')
  .action(async () => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    deepLog(await queue.getWaiting());
  });

vorpal.command('completed', 'fetch completed jobs')
  .action(async () => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    deepLog(await queue.getCompleted());
  });

vorpal.command('failed', 'fetch failed jobs')
  .action(async () => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    deepLog(await queue.getFailed());
  });

vorpal.command('delayed', 'fetch delayed jobs')
  .action(async () => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    deepLog(await queue.getDelayed());
  });

vorpal.command('add <data>', 'add job to queue')
  .action(async ({ data }) => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    queue.add(JSON.parse(data));
  });

vorpal.command('rm <jobId>', 'remove job by id')
  .action(async ({ jobId }) => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    const job = await queue.getJob(jobId);
    if (!job) {
      return console.log(chalk.yellow(`Job "${jobId}" not found`));
    }
    await job.remove();
    console.log(chalk.green(`Job "${jobId}" removed`));
  });

vorpal.command('retry <jobId>', 'retry job by id')
  .action(async ({ jobId }) => {
    if (!queue) {
      return console.log(chalk.red('Need connect before'));
    }
    await queue.isReady();
    const job = await queue.getJob(jobId);
    if (!job) {
      return console.log(chalk.yellow(`Job "${jobId}" not found`));
    }
    await job.retry();
    console.log(chalk.green(`Job "${jobId}" retried`));
  });

vorpal.delimiter('bull-repl$').show();
