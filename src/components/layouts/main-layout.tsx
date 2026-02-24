import type { ReactNode } from "react";

interface MainLayoutProps {
    header: ReactNode;
    left: ReactNode;
    right: ReactNode;
    footer: ReactNode;
}

export function MainLayout({ header, left, right, footer }: MainLayoutProps) {
    return (
        <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 font-mono">
            <header className="shrink-0 px-6 py-4 border-b border-neutral-800">
                {header}
            </header>

            <main className="flex-1 flex min-h-0">
                <div className="w-1/2 overflow-y-auto border-r border-neutral-800 px-4 py-3">
                    {left}
                </div>
                <div className="w-1/2 overflow-y-auto px-6 py-3">
                    {right}
                </div>
            </main>

            <footer className="shrink-0 px-6 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                {footer}
            </footer>
        </div>
    );
}
