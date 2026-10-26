import { describe, expect, test } from "vitest";
import { buildConfig, type OpenCodeConfig } from "../src/config";

const baseInput = {
    providerNpm: "@opencode/ai/providers/openai-compatible",
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
        expect(Object.keys(config.providers)).toEqual(["my-provider"]);
    });

    test("maps inputs onto the expected OpenCode V2 structure", () => {
        const config = buildConfig(baseInput);
        expect(config).toEqual({
            $schema: "https://opencode.ai/config.json",
            providers: {
                "my-provider": {
                    name: "my-provider",
                    env: ["MY_API_KEY"],
                    package: "@opencode/ai/providers/openai-compatible",
                    settings: {
                        baseURL: "https://api.example.com/v1",
                        apiKey: "{env:MY_API_KEY}",
                    },
                    models: {
                        "my-model": {
                            settings: {
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
        const limit = config.providers["my-provider"].models["my-model"].limit;
        expect(limit.context).toBe(32000);
        expect(limit.output).toBe(4096);
        expect(typeof limit.context).toBe("number");
        expect(typeof limit.output).toBe("number");
    });

    test("references the API key by environment variable name", () => {
        const config = buildConfig(baseInput);
        expect(config.providers["my-provider"].settings.apiKey).toBe("{env:MY_API_KEY}");
    });

    test("declares the credential environment variable on the provider", () => {
        const config = buildConfig(baseInput);
        expect(config.providers["my-provider"].env).toEqual(["MY_API_KEY"]);
    });

    test("prefixes legacy @ai-sdk packages with aisdk:", () => {
        const config = buildConfig({ ...baseInput, providerNpm: "@ai-sdk/openai-compatible" });
        expect(config.providers["my-provider"].package).toBe("aisdk:@ai-sdk/openai-compatible");
    });

    test("keeps provider packages that already carry a scheme prefix", () => {
        const prefixed = buildConfig({ ...baseInput, providerNpm: "aisdk:@ai-sdk/openai-compatible" });
        expect(prefixed.providers["my-provider"].package).toBe("aisdk:@ai-sdk/openai-compatible");

        const local = buildConfig({ ...baseInput, providerNpm: "file:///opt/providers/acme" });
        expect(local.providers["my-provider"].package).toBe("file:///opt/providers/acme");
    });

    test("passes custom provider packages through unchanged", () => {
        const config = buildConfig({ ...baseInput, providerNpm: "@acme/opencode-provider" });
        expect(config.providers["my-provider"].package).toBe("@acme/opencode-provider");
    });

    test("does not set a default model by default", () => {
        const config = buildConfig(baseInput);
        expect("model" in config).toBe(false);
    });

    test("sets the default model when model-default is enabled", () => {
        const config = buildConfig({ ...baseInput, modelDefault: "true" });
        expect(config.model).toBe("my-provider/my-model");
    });

    test("accepts a boolean model-default value", () => {
        const config = buildConfig({ ...baseInput, modelDefault: true });
        expect(config.model).toBe("my-provider/my-model");
    });

    test("does not include permissions when permission-json is absent", () => {
        const config = buildConfig(baseInput);
        expect("permissions" in config).toBe(false);
    });

    test("passes a V2 permissions array through unchanged", () => {
        const permissions = [
            { action: "shell", resource: "git push *", effect: "ask" },
            { action: "edit", resource: "*", effect: "allow" },
        ];
        const config = buildConfig({ ...baseInput, permissionJsonInput: JSON.stringify(permissions) });
        expect(config.permissions).toEqual(permissions);
    });

    test("converts a V1 permission map into the ordered V2 permissions array", () => {
        const config = buildConfig({
            ...baseInput,
            permissionJsonInput: JSON.stringify({
                bash: { "git push *": "ask" },
                edit: "allow",
                write: "deny",
                patch: "deny",
                task: "allow",
            }),
        });
        expect(config.permissions).toEqual([
            { action: "shell", resource: "git push *", effect: "ask" },
            { action: "edit", resource: "*", effect: "allow" },
            { action: "edit", resource: "*", effect: "deny" },
            { action: "edit", resource: "*", effect: "deny" },
            { action: "subagent", resource: "*", effect: "allow" },
        ]);
    });

    test("throws when a V1 permission entry is not a valid effect", () => {
        expect(() => buildConfig({ ...baseInput, permissionJsonInput: JSON.stringify({ ask: "always" }) })).toThrow(
            /Invalid permission JSON/
        );
    });

    test("throws when a V1 permission entry has an unconvertible value", () => {
        expect(() => buildConfig({ ...baseInput, permissionJsonInput: JSON.stringify({ edit: 42 }) })).toThrow(
            /Invalid permission JSON/
        );
    });

    test("throws when a permissions array entry is missing required fields", () => {
        expect(() => buildConfig({ ...baseInput, permissionJsonInput: '[{"action":"edit"}]' })).toThrow(
            /Invalid permission JSON/
        );
    });

    test("throws when permission-json is not valid JSON", () => {
        expect(() => buildConfig({ ...baseInput, permissionJsonInput: "{not json" })).toThrow(
            /Invalid permission JSON/
        );
    });

    test("serializes to the documented JSON output", () => {
        const config: OpenCodeConfig = buildConfig({
            ...baseInput,
            modelDefault: "true",
            permissionJsonInput: '[{"action":"edit","resource":"*","effect":"ask"}]',
        });
        const parsed = JSON.parse(JSON.stringify(config, null, 2)) as OpenCodeConfig;
        expect(parsed).toEqual(config);
    });
});
