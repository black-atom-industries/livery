import { UpdateResult } from "./updaters.ts";

export type AppPhase =
    | { phase: "picking" }
    | { phase: "applying"; results: UpdateResult[] }
    | { phase: "done"; results: UpdateResult[] };
