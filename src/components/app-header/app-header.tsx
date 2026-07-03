import styles from "./app-header.module.css";

interface AppHeaderProps {
    version: string;
}

export function AppHeader({ version }: AppHeaderProps) {
    return (
        <div data-component="app-header" className={styles.root}>
            <h1 className={styles.title}>
                Black Atom Livery <span className={styles.version}>v{version}</span>
            </h1>
            <p className={styles.subtitle}>Paint your Cockpit</p>
        </div>
    );
}
