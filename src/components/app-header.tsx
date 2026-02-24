interface AppHeaderProps {
    version: string;
}

export function AppHeader({ version }: AppHeaderProps) {
    return (
        <div>
            <h1 className="text-xl font-bold">
                Black Atom Livery{" "}
                <span className="text-sm font-normal text-neutral-500">v{version}</span>
            </h1>
            <p className="text-sm text-neutral-500">Paint your Cockpit</p>
        </div>
    );
}
