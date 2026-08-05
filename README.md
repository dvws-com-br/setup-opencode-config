# Setup OpenCode config

A GitHub Action that generates an [OpenCode](https://opencode.ai) configuration from action inputs. The generated config is exposed as an output for use by subsequent steps in your workflow.

## Usage

```yaml
steps:
  - uses: your-org/setup-opencode-config@v1
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

  - name: Use generated config
    run: echo "${{ steps.opencode.outputs.config }}"
```

## Inputs

| Input | Description | Required | Default |
| --- | --- | --- | --- |
| `provider-npm` | The provider npm package to use | Yes | `@ai-sdk/openai-compatible` |
| `provider-name` | The provider name to use | Yes | |
| `provider-base-url` | Provider base URL | Yes | |
| `provider-api-key-name` | Name of the environment variable containing the API key | Yes | |
| `provider-model-name` | The provider model name to use | Yes | |
| `provider-model-limit-context` | The context limit for the provider model | Yes | |
| `provider-model-limit-output` | The output limit for the provider model | Yes | |
| `provider-model-options-reasoningEffort` | The reasoning effort for the provider model | Yes | |
| `provider-model-options-textVerbosity` | The text verbosity for the provider model | Yes | |
| `provider-model-options-reasoningSummary` | The reasoning summary for the provider model | Yes | |
| `permission-json` | The permission JSON for the OpenCode configuration | No | |

The API key is referenced from the environment variable named by `provider-api-key-name` (the action never receives the actual secret). Set the secret in your workflow, for example:

```yaml
jobs:
  example:
    env:
      MY_API_KEY: ${{ secrets.MY_API_KEY }}
```

## Outputs

| Output | Description |
| --- | --- |
| `config` | The generated OpenCode JSON configuration |

### Example output

```json
{
  "provider": {
    "my-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "my-provider",
      "options": {
        "baseURL": "https://api.example.com/v1",
        "apiKey": "{env:MY_API_KEY}"
      },
      "models": {
        "my-model": {
          "options": {
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
  }
}
```

When the optional `permission-json` input is provided, a `permission` key is added to the generated config with the parsed JSON value.

## Development

```bash
npm install
npm run build   # compiles src/index.ts into dist/index.js with ncc
npm run lint    # type-checks the source (tsc --noEmit)
```

The `dist/index.js` bundle is checked in and used as the action entry point.
