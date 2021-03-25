# bull-repl

Bull / BullMQ queue command line REPL.

### Install

```
git clone https://github.com/jesusprubio/bull-repl
cd bull-repl
npm i
npm run build
```

### Run

```
node .
```

### Overview help

```
help
```

```
  Commands:

    help [command...]          Provides help for a given command.
    exit                       Exits application.
    connect [options] <queue>  Connect to bull queue
    connect-list               List of saved connections
    connect-rm <name>          Remove saved connection
    connect-save <name>        Save current connection
    connect-to <name>          Connect to saved connection
    stats                      Count of jobs by type
    active [options]           Fetch active jobs
    waiting [options]          Fetch waiting jobs
    completed [options]        Fetch completed jobs
    failed [options]           Fetch failed jobs
    delayed [options]          Fetch delayed jobs
    pause                      Pause current queue
    resume                     Resume current queue from pause
    get <jobId...>             Get job
    add [options] <data>       Add job to queue e.g. add '{"x": 1}'
    rm <jobId...>              Remove job
    retry <jobId...>           Retry job
    retry-failed               Retry first 100 failed jobs
    promote <jobId...>         Promote job
    fail <jobId> <reason>      Move job to failed
    complete <jobId> <data>    Move job to completed e.g. complete 1 '{"x": 1}'
    clean [options] <period>   Clean queue for period ago, period format - https://github.com/zeit/ms#examples
    logs [options] <jobId>     Get logs of job
    log <jobId> <data>         Add log to job
    events-on                  Turn on logging of queue events
    events-off                 Turn off logging of queue events
```

### Connect help

```
connect --help
```

```
  Usage: connect [options] <queue>

  Connect to bull queue

  Options:

    --help                 output usage information
    --prefix <prefix>      Prefix to use for all queue jobs
    -h, --host <host>      Redis host for connection
    -p, --port <port>      Redis port for connection
    -d, --db <db>          Redis db for connection
    --password <password>  Redis password for connection
    -c, --cert <cert>      Absolute path to pem certificate if TLS used
```

### Fetch jobs by group help

```
active --help
```

```
  Usage: active [options]

  Fetch active jobs

  Options:

    --help                   output usage information
    -q, --query <query>      Query jobs via jq - https://stedolan.github.io/jq/manual/#Basicfilters. Notice, that bull data in root key e.g '[.root[] | select(.progress > 70)]'
    -t, --timeAgo <timeAgo>  Get jobs since time ago via https://github.com/zeit/ms#examples
    -s, --start <start>      Start index (pagination)
    -e, --end <end>          End index (pagination)
```

### Notes

- You can see help on each command, for example: `connect --help`
- You can predefine startup command, when run bull-repl. For example: `bull-repl connect my-queue`
