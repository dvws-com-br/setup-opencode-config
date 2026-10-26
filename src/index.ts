import * as core from "@actions/core";
import { buildConfig } from "./config";

async function run(): Promise<void> {
    try {
        const config = buildConfig({
            providerNpm: core.getInput("provider-npm"),
            baseUrl: core.getInput("provider-base-url"),
            apikeyName: core.getInput("provider-api-key-name"),
            providerName: core.getInput("provider-name"),
            providerModelName: core.getInput("provider-model-name"),
            providerModelLimitContext: core.getInput("provider-model-limit-context"),
            providerModelLimitOutput: core.getInput("provider-model-limit-output"),
            providerModelOptionsReasoningEffort: core.getInput("provider-model-options-reasoningEffort"),
            providerModelOptionsTextVerbosity: core.getInput("provider-model-options-textVerbosity"),
            providerModelOptionsReasoningSummary: core.getInput("provider-model-options-reasoningSummary"),
            permissionJsonInput: core.getInput("permission-json"),
            modelDefault: core.getInput("model-default"),
        });

        core.setOutput("config", JSON.stringify(config, null, 2));
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

void run();
