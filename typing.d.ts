declare module "@moleculer/vorpal" {
  import Vorpal from "vorpal";
  export default Vorpal;
}

declare module 'redis-url-plus' {
  export default function redisUrlPlus(url: string): import('ioredis').RedisOptions;
}