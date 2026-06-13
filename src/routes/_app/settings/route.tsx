import { createFileRoute } from "@tanstack/react-router";
import { Typo } from "../../../components/typo/index.ts";
import styles from "./route.module.css";

export const Route = createFileRoute("/_app/settings")({
    component: SettingsRoute,
});

function SettingsRoute() {
    return (
        <div className={styles.root}>
            <div className={styles.heading}>
                <Typo.H2>Settings</Typo.H2>
            </div>
            <Typo.Small color="hint">Coming soon.</Typo.Small>
        </div>
    );
}
