import { assertEquals } from "@std/assert";
import { pacedView } from "./paced-view.ts";
import type { UpdateResult } from "../../lib/updaters.ts";

const RESULTS: UpdateResult[] = [
    { app: "nvim", status: "done", duration_ms: 12 },
    { app: "tmux", status: "done", duration_ms: 8 },
    { app: "ghostty", status: "running", duration_ms: null },
    { app: "delta", status: "pending", duration_ms: null },
];

Deno.test("pacedView passes results through once fully revealed", () => {
    assertEquals(pacedView(RESULTS, 4), RESULTS);
    assertEquals(pacedView(RESULTS, 99), RESULTS);
});

Deno.test("pacedView holds a settled row as running while it is being revealed", () => {
    const view = pacedView(RESULTS, 1);
    assertEquals(view[0], RESULTS[0]);
    assertEquals(view[1], { app: "tmux", status: "running", duration_ms: null });
    assertEquals(view[2].status, "pending");
    assertEquals(view[3].status, "pending");
});

Deno.test("pacedView leaves a genuinely unfinished row untouched at the reveal cursor", () => {
    const view = pacedView(RESULTS, 2);
    assertEquals(view[2], RESULTS[2]);
});

Deno.test("pacedView masks not-yet-revealed rows as pending, dropping durations", () => {
    const view = pacedView(RESULTS, 0);
    assertEquals(view[0], { app: "nvim", status: "running", duration_ms: null });
    assertEquals(
        view.slice(1).every((r) => r.status === "pending" && r.duration_ms === null),
        true,
    );
});
