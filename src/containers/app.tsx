import { getThemeEntries } from "../lib/themes.ts";

const themes = getThemeEntries();

export function App() {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono">
            <h1 className="text-2xl font-bold mb-1">Livery</h1>
            <p className="text-neutral-500 mb-6">Paint your Cockpit</p>
            <p className="text-neutral-400 mb-4">{themes.length} themes loaded</p>
            <ul className="space-y-1 text-sm">
                {themes.map((entry) => (
                    <li key={entry.key} className="text-neutral-300">
                        {entry.meta.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
