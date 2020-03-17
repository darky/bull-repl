declare module "searchjs" {
  export function matchArray<T>(array: Array<T>, filter: object): Array<T>;
}

declare module "@moleculer/vorpal" {
  import Vorpal from "vorpal";
  export default Vorpal;
}
