import { Progress } from "@base-ui/react/progress";
import type { UpdateResult } from "../lib/updaters.ts";
import { getProgressState } from "../lib/progress.ts";

interface ProgressBarProps {
    results: UpdateResult[];
}

export function ProgressBar({ results }: ProgressBarProps) {
    const { value, completedCount, total, currentLabel, status } = getProgressState(results);

    const indicatorColor = {
        idle: "bg-neutral-600",
        running: "bg-amber-500",
        done: "bg-green-500",
        error: "bg-red-500",
    }[status];

    const labelText = status === "running" && currentLabel
        ? `Applying ${currentLabel}...`
        : status === "done"
        ? "Done"
        : status === "error"
        ? "Completed with errors"
        : "Waiting...";

    return (
        <Progress.Root
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1"
            value={value}
            max={100}
        >
            <Progress.Label className="text-xs text-neutral-400">
                {labelText}
            </Progress.Label>
            <span className="text-xs text-neutral-500 tabular-nums">
                {completedCount} / {total}
            </span>
            <Progress.Track className="col-span-full h-1 overflow-hidden rounded bg-neutral-800">
                <Progress.Indicator
                    className={`block h-full transition-all duration-300 ${indicatorColor}`}
                />
            </Progress.Track>
        </Progress.Root>
    );
}
