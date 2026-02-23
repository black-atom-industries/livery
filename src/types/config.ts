import { ToolConfig, ToolName } from "./tools.ts";

export interface Config {
    system_appearance: boolean;
    tools: Partial<Record<ToolName, ToolConfig>>;
}
