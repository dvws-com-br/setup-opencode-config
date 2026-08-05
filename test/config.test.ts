import { describe, expect, test } from "vitest";
import { buildConfig, type OpenCodeConfig } from "../src/config";

const baseInput = {
    providerNpm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.example.com/v1",
    apikeyName: "MY_API_KEY",
    providerName: "my-provider",
    providerModelName: "my-model",
    providerModelLimitContext: "32000",
    providerModelLimitOutput: "4096",
    providerModelOptionsReasoningEffort: "high",
    providerModelOptionsTextVerbosity: "concise",
    providerModelOptionsReasoningSummary: "disabled",
};

describe("buildConfig", () => {
    test("builds a config with the provider keyed by provider name", () => {
        const config = buildConfig(baseInput);
        expect(Object.keys(config.provider)).toEqual(["my-provider"]);
    });

    test("maps inputs onto the expected OpenCode structure", () => {
        const config = buildConfig(baseInput);
        expect(config).toEqual({
            provider: {
                "my-provider": {
                    npm: "@ai-sdk/openai-compatible",
                    name: "my-provider",
                    options: {
                        baseURL: "https://api.example.com/v1",
                        apiKey: "{env:MY_API_KEY}",
                    },
                    models: {
                        "my-model": {
                            options: {
                                reasoningEffort: "high",
                                textVerbosity: "concise",
                                reasoningSummary: "disabled",
                            },
                            limit: {
                                context: 32000,
                                output: 4096,
                            },
                        },
                    },
                },
            },
        });
    });

    test("parses numeric limit inputs into numbers", () => {
        const config = buildConfig(baseInput);
        const limit = config.provider["my-provider"].models["my-model"].limit;
        expect(limit.context).toBe(32000);
        expect(limit.output).toBe(4096);
        expect(typeof limit.context).toBe("number");
        expect(typeof limit.output).toBe("number");
    });

    test("references the API key by environment variable name", () => {
        const config = buildConfig(baseInput);
        expect(config.provider["my-provider"].options.apiKey).toBe("{env:MY_API_KEY}");
    });

    test("does not include a permission key when permission-json is absent", () => {
        const config = buildConfig(baseInput);
        expect("permission" in config).toBe(false);
    });

    test("includes parsed permissions when permission-json is provided", () => {
        const config = buildConfig({
            ...baseInput,
            permissionJsonInput: JSON.stringify({ ask: "always", bash: { allow: ["git"] } }),
        });
        expect(config.permission).toEqual({ ask: "always", bash: { allow: ["git"] } });
    });

    test("throws when permission-json is not valid JSON", () => {
        expect(() => buildConfig({ ...baseInput, permissionJsonInput: "{not json" })).toThrow(
            /Invalid permission JSON/
        );
    });

    test("serializes to the documented JSON output", () => {
        const config: OpenCodeConfig = buildConfig(baseInput);
        const parsed = JSON.parse(JSON.stringify(config, null, 2)) as OpenCodeConfig;
        expect(parsed).toEqual(config);
    });
});
