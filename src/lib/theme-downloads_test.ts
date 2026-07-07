import { assert, assertEquals } from "@std/assert";
import {
    formatFetchedAt,
    hasDownloadErrors,
    initialDownloadRows,
    latestFetchedAtEpoch,
} from "./theme-downloads.ts";

Deno.test("initialDownloadRows sorts apps and starts them pending", () => {
    const rows = initialDownloadRows(["zed", "ghostty", "tmux"]);
    assertEquals(rows.map((r) => r.app), ["ghostty", "tmux", "zed"]);
    assert(rows.every((r) => r.status === "pending"));
    assert(rows.every((r) => r.file_count === null && r.duration_ms === null));
});

Deno.test("hasDownloadErrors reads null results as clean", () => {
    assertEquals(hasDownloadErrors(null), false);
});

Deno.test("hasDownloadErrors flags a single error row", () => {
    const rows = initialDownloadRows(["tmux", "zed"]);
    assertEquals(hasDownloadErrors(rows), false);
    rows[1] = { ...rows[1], status: "error", message: "HTTP 404" };
    assertEquals(hasDownloadErrors(rows), true);
});

Deno.test("formatFetchedAt renders a local YYYY-MM-DD HH:MM stamp", () => {
    const stamp = formatFetchedAt(1_751_884_800);
    assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(stamp), `unexpected format: ${stamp}`);
});

Deno.test("latestFetchedAtEpoch picks the newest adapter fetch", () => {
    assertEquals(
        latestFetchedAtEpoch({
            tmux: { downloaded: true, fetched_at_epoch: 100, file_count: 44 },
            zed: { downloaded: true, fetched_at_epoch: 300, file_count: 44 },
            ghostty: { downloaded: false, fetched_at_epoch: null, file_count: null },
        }),
        300,
    );
});

Deno.test("latestFetchedAtEpoch is null when nothing was downloaded", () => {
    assertEquals(
        latestFetchedAtEpoch({
            tmux: { downloaded: false, fetched_at_epoch: null, file_count: null },
        }),
        null,
    );
});
