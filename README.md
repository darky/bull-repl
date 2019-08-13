# bull-repl

Bull queue command line REPL.

```
npm install bull-repl -g
bull-repl
help
```

```
  Commands:

    help [command...]                Provides help for a given command.
    exit                             Exits application.
    connect [options] <queue> [url]  connect to bull queue
    stats                            count of jobs by groups
    active                           fetch active jobs
    waiting                          fetch waiting jobs
    completed                        fetch completed jobs
    failed                           fetch failed jobs
    delayed                          fetch delayed jobs
    add [options] <data>             add job to queue
    rm <jobId>                       remove job
    retry <jobId>                    retry job
    fail <jobId> <reason>            fail job
    complete <jobId> <data>          complete job
```
