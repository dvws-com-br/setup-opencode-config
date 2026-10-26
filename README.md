# Setup OpenCode config

[![Latest Version on Packagist](https://img.shields.io/github/v/tag/dvws-com-br/setup-opencode-config)](https://github.com/dvws-com-br/setup-opencode-config)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/dvws-com-br/setup-opencode-config/test.yml?branch=main&label=tests&style=flat-square)](https://github.com/dvws-com-br/setup-opencode-config/actions?query=workflow%3Atest+branch%3Amain)

A GitHub Action that generates a native [OpenCode](https://opencode.ai) V2 configuration from action inputs. The generated config is exposed as an output for use by subsequent steps in your workflow.

OpenCode V2 still accepts legacy V1 configuration, but this action emits the native V2 shape (`providers`, `package`, `settings`, `permissions`). If you need the legacy V1 output, pin the `v1` tag of this action.

## Usage

```yaml
steps:
  - uses: dvws-com-br/setup-opencode-config@v2
    id: opencode
    with:
      provider-name: "my-provider"
      provider-base-url: "https://api.example.com/v1"
      provider-api-key-name: "MY_API_KEY"
      provider-model-name: "my-model"
      provider-model-limit-context: "32000"
      provider-model-limit-output: "4096"
      provider-model-options-reasoningEffort: "high"
      provider-model-options-textVerbosity: "concise"
      provider-model-options-reasoningSummary: "disabled"
      model-default: "true"
      permission-json: '[{"action":"shell","resource":"git push *","effect":"ask"}]'

  - name: Use generated config
    run: echo "${{ steps.opencode.outputs.config }}"
```

## Inputs

| Input | Description | Required | Default |
| --- | --- | --- | --- |
| `provider-npm` | Runtime provider package. Native OpenCode packages (`@opencode/ai/providers/*`) and custom packages are used as-is; legacy `@ai-sdk/*` packages are automatically prefixed with `aisdk:` for OpenCode V2 | Yes | `@opencode/ai/providers/openai-compatible` |
| `provider-name` | The provider name to use | Yes | |
| `provider-base-url` | Provider base URL | Yes | |
| `provider-api-key-name` | Name of the environment variable containing the API key | Yes | |
| `provider-model-name` | The provider model name to use | Yes | |
| `provider-model-limit-context` | The context limit for the provider model | Yes | |
| `provider-model-limit-output` | The output limit for the provider model | Yes | |
| `provider-model-options-reasoningEffort` | The reasoning effort for the provider model | Yes | |
| `provider-model-options-textVerbosity` | The text verbosity for the provider model | Yes | |
| `provider-model-options-reasoningSummary` | The reasoning summary for the provider model | Yes | |
| `permission-json` | OpenCode V2 permissions array of `{action, resource, effect}` entries. Legacy V1 tool-grouped maps are converted automatically (`bash`→`shell`, `task`→`subagent`, `write`/`patch`→`edit`) | No | |
| `model-default` | Set to `"true"` to also emit a top-level `model` default set to `<provider-name>/<provider-model-name>` | No | `"false"` |

The API key is referenced from the environment variable named by `provider-api-key-name` (the action never receives the actual secret). The variable is also declared on the provider's `env` list. Set the secret in your workflow, for example:

```yaml
jobs:
  example:
    env:
      MY_API_KEY: ${{ secrets.MY_API_KEY }}
```

## Outputs

| Output | Description |
| --- | --- |
| `config` | The generated OpenCode V2 JSON configuration |

### Example output

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "my-provider/my-model",
  "providers": {
    "my-provider": {
      "name": "my-provider",
      "env": ["MY_API_KEY"],
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "https://api.example.com/v1",
        "apiKey": "{env:MY_API_KEY}"
      },
      "models": {
        "my-model": {
          "settings": {
            "reasoningEffort": "high",
            "textVerbosity": "concise",
            "reasoningSummary": "disabled"
          },
          "limit": {
            "context": 32000,
            "output": 4096
          }
        }
      }
    }
  },
  "permissions": [
    { "action": "shell", "resource": "git push *", "effect": "ask" }
  ]
}
```

The `model` and `permissions` keys are only present when `model-default` is enabled and `permission-json` is provided, respectively.

## OpenCode V2 notes

- The action targets the [OpenCode V2 configuration format](https://opencode.ai/v2/docs/config). The emitted `$schema` key enables editor validation against the published schema.
- Behavior changes to be aware of when moving from V1 to V2: `external_directory` access is **allowed by default** in V2 (V1 asked first) — add `{ "action": "external_directory", "resource": "*", "effect": "ask" }` to `permission-json` to keep the V1 behavior — and todos are off by default in V2.

## Development

```bash
npm install
npm run build   # compiles src/index.ts into dist/index.js with ncc
npm run lint    # type-checks the source (tsc --noEmit)
npm test        # runs the vitest suite
```

The `dist/index.js` bundle is checked in and used as the action entry point (CI fails if it is stale).
