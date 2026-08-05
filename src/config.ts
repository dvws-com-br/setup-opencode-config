export type OpencodeModelOptions = {
    reasoningEffort: string;
    textVerbosity: string;
    reasoningSummary: string;
}

export type OpencodeModelLimit = {
    context: number;
    output: number;
}

export type OpencodeProviderModel = {
    options: OpencodeModelOptions;
    limit: OpencodeModelLimit;
}

export type OpencodeModelName = string;

export type OpencodeProviderModels = Record<OpencodeModelName, OpencodeProviderModel>;

export type OpencodeProviderOptions = {
    baseURL: string;
    apiKey: string;
}

export type OpencodeProviderName = string;

export type OpencodeProvider = {
    npm: string;
    name: OpencodeProviderName;
    options: OpencodeProviderOptions;
    models: OpencodeProviderModels;
}

export type OpencodeProviders = Record<OpencodeProviderName, OpencodeProvider>;

export type OpencodePermissions = Record<string, any>;

export type OpenCodeConfig = {
    provider: OpencodeProviders;
    permission?: OpencodePermissions;
}

export type BuildConfigInput = {
    providerNpm: string;
    baseUrl: string;
    apikeyName: string;
    providerName: string;
    providerModelName: string;
    providerModelLimitContext: string;
    providerModelLimitOutput: string;
    providerModelOptionsReasoningEffort: string;
    providerModelOptionsTextVerbosity: string;
    providerModelOptionsReasoningSummary: string;
    permissionJsonInput?: string | null;
}

const DEFAULT_INPUT: BuildConfigInput = {
    providerNpm: "@ai-sdk/openai-compatible",
    baseUrl: "",
    apikeyName: "",
    providerName: "",
    providerModelName: "",
    providerModelLimitContext: "",
    providerModelLimitOutput: "",
    providerModelOptionsReasoningEffort: "",
    providerModelOptionsTextVerbosity: "",
    providerModelOptionsReasoningSummary: "",
    permissionJsonInput: null,
}

export function buildConfig(input: Partial<BuildConfigInput>): OpenCodeConfig {
    const values: BuildConfigInput = { ...DEFAULT_INPUT, ...input };
    const permissions = getPermissions(values.permissionJsonInput);

    const config: OpenCodeConfig = {
        provider: {
            [values.providerName]: {
                npm: values.providerNpm,
                name: values.providerName,
                options: {
                    baseURL: values.baseUrl,
                    "apiKey": `{env:${values.apikeyName}}`
                },
                models: {
                    [values.providerModelName]: {
                        options: {
                            reasoningEffort: values.providerModelOptionsReasoningEffort,
                            textVerbosity: values.providerModelOptionsTextVerbosity,
                            reasoningSummary: values.providerModelOptionsReasoningSummary,
                        },
                        limit: {
                            context: parseInt(values.providerModelLimitContext),
                            output: parseInt(values.providerModelLimitOutput),
                        },
                    },
                },
            },
        },
    };

    if (permissions) {
        config["permission"] = permissions;
    }

    return config;
}

const getPermissions = (permissionJsonInput: string | undefined | null): OpencodePermissions | null => {
    if (permissionJsonInput) {
        try {
            return JSON.parse(permissionJsonInput) as OpencodePermissions;
        }
        catch (error) {
            throw new Error(`Invalid permission JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return null;
}
