import { AppConfig, AppName } from "./apps.ts";

export interface Config {
    system_appearance: boolean;
    apps: Partial<Record<AppName, AppConfig>>;
}
