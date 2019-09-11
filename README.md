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
    active [options]                 fetch active jobs
    waiting [options]                fetch waiting jobs
    completed [options]              fetch completed jobs
    failed [options]                 fetch failed jobs
    delayed [options]                fetch delayed jobs
    add [options] <data>             add job to queue
    rm <jobId>                       remove job
    retry <jobId>                    retry job
    fail <jobId> <reason>            fail job
    complete <jobId> <data>          complete job
```
