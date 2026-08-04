import * as core from "@actions/core";

type OpencodeModelOptions = {
    reasoningEffort: string;
    textVerbosity: string;
    reasoningSummary: string;
}
type OpencodeModelLimit = {
    context: number;
    output: number;
}

type OpencodeProviderModel = {
    options: OpencodeModelOptions;
    limit: OpencodeModelLimit;
}

type OpencodeModelName = string;

type OpencodeProviderModels = Record<OpencodeModelName, OpencodeProviderModel>;

type OpencodeProviderOptions = {
    baseURL: string;
    apiKey: string;
}

type OpencodeProviderName = string;

type OpencodeProvider = {
    npm: string;
    name: OpencodeProviderName;
    options: OpencodeProviderOptions;
    models: OpencodeProviderModels;
}

type OpencodeProviders = Record<OpencodeProviderName, OpencodeProvider>;

type OpencodePermissions = Record<string, any>;

type OpenCodeConfig = {
    provider: OpencodeProviders;
    permission?: OpencodePermissions;
};

async function run(): Promise<void> {
    try {
        const providerNpm: string = core.getInput("provider-npm");
        const baseUrl: string = core.getInput("provider-base-url");
        const apikeyName: string = core.getInput("provider-api-key-name");
        const providerName: string = core.getInput("provider-name");
        const providerModelName: string = core.getInput("provider-model-name");
        const providerModelLimitContext: string = core.getInput("provider-model-limit-context");
        const providerModelLimitOutput: string = core.getInput("provider-model-limit-output");
        const providerModelOptionsReasoningEffort: string = core.getInput("provider-model-options-reasoningEffort");
        const providerModelOptionsTextVerbosity: string = core.getInput("provider-model-options-textVerbosity");
        const providerModelOptionsReasoningSummary: string = core.getInput("provider-model-options-reasoningSummary");
        const permissionJsonInput: string | undefined | null = core.getInput("permission-json");
        
        const permissions = getPermissions(permissionJsonInput);
       
       
        const config: OpenCodeConfig = {
            provider: {
                [providerName]: {
                    npm: providerNpm,
                    name: providerName,
                    options: {
                        baseURL: baseUrl,
                        "apiKey": `{env:${apikeyName}}`
                    },
                    models: {
                        [providerModelName]: {
                            options: {
                                reasoningEffort: providerModelOptionsReasoningEffort,
                                textVerbosity: providerModelOptionsTextVerbosity,
                                reasoningSummary: providerModelOptionsReasoningSummary,
                            },
                            limit: {
                                context: parseInt(providerModelLimitContext),
                                output: parseInt(providerModelLimitOutput),
                            },
                        },
                    },
                },
            },
        };
        
        if (permissions) {
            config["permission"] = permissions;
        }

        core.setOutput("config", JSON.stringify(config, null, 2));
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

const getPermissions = (permissionJsonInput: string | undefined | null) => {
    if (permissionJsonInput) {
        try {
            return JSON.parse(permissionJsonInput);
        }
        catch (error) {
            core.setFailed(`Invalid permission JSON: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    return null;
}

void run();