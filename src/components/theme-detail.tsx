import type { Definition } from "@black-atom/core";
import { extractShortName } from "../lib/themes.ts";

interface ThemeDetailProps {
    theme: Definition | undefined;
}

export function ThemeDetail({ theme }: ThemeDetailProps) {
    if (!theme) {
        return <div className="text-neutral-600 text-sm">No theme selected</div>;
    }

    const name = extractShortName(theme.meta);
    const appearance = theme.meta.appearance;
    const collection = theme.meta.collection.label;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-1">
                {name}{" "}
                <span
                    className={`text-sm font-normal px-2 py-0.5 rounded ${
                        appearance === "dark"
                            ? "bg-neutral-800 text-neutral-400"
                            : "bg-neutral-200 text-neutral-800"
                    }`}
                >
                    {appearance}
                </span>
            </h2>
            <p className="text-sm text-neutral-500">{collection}</p>
        </div>
    );
}
