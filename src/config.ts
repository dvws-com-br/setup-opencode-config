export type OpencodeModelSettings = {
    reasoningEffort: string;
    textVerbosity: string;
    reasoningSummary: string;
}

export type OpencodeModelLimit = {
    context: number;
    output: number;
}

export type OpencodeProviderModel = {
    settings: OpencodeModelSettings;
    limit: OpencodeModelLimit;
}

export type OpencodeModelName = string;

export type OpencodeProviderModels = Record<OpencodeModelName, OpencodeProviderModel>;

export type OpencodeProviderSettings = {
    baseURL: string;
    apiKey: string;
}

export type OpencodeProviderName = string;

export type OpencodeProvider = {
    name: OpencodeProviderName;
    env?: string[];
    package: string;
    settings: OpencodeProviderSettings;
    models: OpencodeProviderModels;
}

export type OpencodeProviders = Record<OpencodeProviderName, OpencodeProvider>;

export type OpencodePermissionEffect = "allow" | "deny" | "ask";

export type OpencodePermission = {
    action: string;
    resource: string;
    effect: OpencodePermissionEffect;
}

export type OpencodePermissions = OpencodePermission[];

export const OPENCODE_CONFIG_SCHEMA = "https://opencode.ai/config.json";

export type OpenCodeConfig = {
    $schema: string;
    model?: string;
    providers: OpencodeProviders;
    permissions?: OpencodePermissions;
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
    modelDefault?: string | boolean | null;
}

const DEFAULT_INPUT: BuildConfigInput = {
    providerNpm: "@opencode/ai/providers/openai-compatible",
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
    modelDefault: "false",
}

/**
 * Map a provider runtime package input onto the native V2 `package` value.
 *
 * - Values that already carry a scheme prefix (`aisdk:`, `file:`) are kept as-is.
 * - Legacy AI SDK packages (`@ai-sdk/*`) receive the `aisdk:` prefix, following the
 *   documented V1 to V2 migration mapping.
 * - Native OpenCode packages (`@opencode/ai/providers/*`) and custom packages are
 *   passed through unchanged.
 */
const mapProviderPackage = (providerNpm: string): string => {
    if (providerNpm.includes(":")) {
        return providerNpm;
    }
    if (providerNpm.startsWith("@ai-sdk/")) {
        return `aisdk:${providerNpm}`;
    }
    return providerNpm;
}

const V1_PERMISSION_ACTION_RENAMES: Record<string, string> = {
    bash: "shell",
    task: "subagent",
    write: "edit",
    patch: "edit",
}

const PERMISSION_EFFECTS: OpencodePermissionEffect[] = ["allow", "deny", "ask"];

const isEffect = (value: unknown): value is OpencodePermissionEffect =>
    typeof value === "string" && (PERMISSION_EFFECTS as string[]).includes(value);

const asEffect = (value: unknown, context: string): OpencodePermissionEffect => {
    if (!isEffect(value)) {
        throw new Error(`Invalid permission JSON: ${context} must be "allow", "deny" or "ask", received ${JSON.stringify(value)}`);
    }
    return value;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isV2PermissionEntry = (value: unknown): value is OpencodePermission =>
    isRecord(value)
    && typeof value["action"] === "string"
    && typeof value["resource"] === "string"
    && isEffect(value["effect"]);

/** Convert a V1 tool-grouped permission map into the ordered V2 permissions array. */
const convertV1Permissions = (map: Record<string, unknown>): OpencodePermissions => {
    const permissions: OpencodePermissions = [];

    for (const [key, value] of Object.entries(map)) {
        const action = V1_PERMISSION_ACTION_RENAMES[key] ?? key;

        if (typeof value === "string") {
            permissions.push({
                action,
                resource: "*",
                effect: asEffect(value, `V1 entry "${key}"`),
            });
            continue;
        }

        if (isRecord(value)) {
            for (const [resource, effect] of Object.entries(value)) {
                permissions.push({
                    action,
                    resource,
                    effect: asEffect(effect, `V1 entry "${key}" resource "${resource}"`),
                });
            }
            continue;
        }

        throw new Error(`Invalid permission JSON: cannot convert V1 entry "${key}" to a V2 permission; pass the V2 array format instead`);
    }

    return permissions;
}

const getPermissions = (permissionJsonInput: string | undefined | null): OpencodePermissions | null => {
    if (permissionJsonInput) {
        let parsed: unknown;
        try {
            parsed = JSON.parse(permissionJsonInput);
        }
        catch (error) {
            throw new Error(`Invalid permission JSON: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (Array.isArray(parsed)) {
            for (const entry of parsed) {
                if (!isV2PermissionEntry(entry)) {
                    throw new Error(`Invalid permission JSON: every array entry needs "action", "resource" and an "effect" of "allow", "deny" or "ask"`);
                }
            }
            return parsed as OpencodePermissions;
        }

        if (isRecord(parsed)) {
            return convertV1Permissions(parsed);
        }

        throw new Error(`Invalid permission JSON: expected a V2 permissions array or a V1 permission map`);
    }
    return null;
}

export function buildConfig(input: Partial<BuildConfigInput>): OpenCodeConfig {
    const values: BuildConfigInput = { ...DEFAULT_INPUT, ...input };
    const permissions = getPermissions(values.permissionJsonInput);
    const env = values.apikeyName ? [values.apikeyName] : [];
    const setDefaultModel = values.modelDefault === true || values.modelDefault === "true";

    const config: OpenCodeConfig = {
        $schema: OPENCODE_CONFIG_SCHEMA,
        ...(setDefaultModel ? { model: `${values.providerName}/${values.providerModelName}` } : {}),
        providers: {
            [values.providerName]: {
                name: values.providerName,
                ...(env.length ? { env } : {}),
                package: mapProviderPackage(values.providerNpm),
                settings: {
                    baseURL: values.baseUrl,
                    "apiKey": `{env:${values.apikeyName}}`
                },
                models: {
                    [values.providerModelName]: {
                        settings: {
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
        ...(permissions ? { permissions } : {}),
    };

    return config;
}
