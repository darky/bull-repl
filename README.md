# bull-repl

Bull / BullMQ queue command line REPL.

### BullMQ 4 Beta

You can try bull-repl with upcoming BullMQ via `npm install bull-repl@next`

### Doc

```
npm install bull-repl -g
bull-repl
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
    clean [options] <period>   Clean queue for period ago, period format - ms (https://github.com/zeit/ms#examples)
    logs [options] <jobId>     Get logs of job
    log <jobId> <data>         Add log to job
```

### Notes

- You can see help on each command, for example: `connect --help`
- Also you can predefine startup command, when run bull-repl. For example: `bull-repl connect my-queue`
