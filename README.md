![](assets/logo.png) ![npm install -g @harperfast/agent](./README.svg)

AI to help you with Harper app creation and management.

## Prerequisites

- Node.js (v24 or higher recommended)
- An API key for your preferred AI model:
  - **OpenAI**: https://platform.openai.com/api-keys
  - **Anthropic**: https://console.anthropic.com/settings/keys
  - **Google Gemini**: https://aistudio.google.com/app/apikey
  - **Ollama**: (No API key required, see [Ollama Support](#ollama-support-local-models) below)

## Getting Started

When you first run `harper-agent`, it will guide you through setting up your environment.

![What model provider would you like to use today? OpenAI, Anthropic, Google or Ollama](guidance/pick-a-provider.png)

It will then automatically save it to either `~/.harper/harper-agent-env` or your local `.env` file in your current working directory.

Now install harper-agent:

```bash
npm install -g @harperfast/agent
```

Or run it with npx:

```
npx -y @harperfast/agent
```

You're ready to go!

![What would you like to create together?](guidance/what-would-you-like-to-create-together.png)

## Usage

Once installed or running, you can ask harper-agent to help you with tasks in your current directory, such as applying patches or managing your Harper application.

Press `Ctrl+C` or type "exit" or hit enter twice to exit.

### Non-interactive: pass an initial prompt

You can pass an initial `--prompt=`. Harper Agent will turn that into an actionable plan, and then it will iterate until it completes it.

```bash
harper-agent --prompt="Write a poem generation app, please"
```

In this mode, the initial greeting question is suppressed, and the agent processes the provided prompt immediately.

## Manual Environment Configuration

If you prefer to set up your environment manually, you can create a `.env` file:

```bash
# For OpenAI (default)
OPENAI_API_KEY=your_api_key_here

# For Anthropic
ANTHROPIC_API_KEY=your_api_key_here

# For Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

(If you'd rather export these environment variables from within your .zshrc or equivalent file, you can do that instead.)

## Model Selection

When you first fire up Harper Agent, it will ask you what model you want to use. You can also control this with command line arguments:

```bash
# Use Claude 3.5 Sonnet
harper-agent --model claude-4-6-opus-latest

# Use Gemini 1.5 Pro
harper-agent --model gemini-3-pro

# Use a specific OpenAI model
harper-agent --model gpt-5.2
```

Or you can set the default model via the `HARPER_AGENT_MODEL` environment variable in your `.env` file or in `~/.harper/harper-agent-env`

### Compaction Model

A smaller model will be used for compaction, depending on your chosen LLM provider. You can specify your model using the `--compaction-model` (or `-c`) flag:

```bash
# Use a different compaction model
harper-agent --compaction-model claude-4-5-haiku-latest
```

You can also set the default compaction model via the `HARPER_AGENT_COMPACTION_MODEL` environment variable.

### Session Persistence

Harper Agent will ask if it can persist your chat session to a JSON database on disk using the `--session` (or `-s`) flag:

```bash
# Persist session to a file
harper-agent --session ./my-session.db
```

This will save all conversation history to the specified file. If the file already exists, `harper-agent` will resume the session from where you left off.

You can also set the default session path via the `HARPER_AGENT_SESSION` environment variable.

### Service Tier (OpenAI Only)

By default, `harper-agent` uses the `auto` service tier. You can force the `flex` tier to be used with the `--flex-tier` flag:

```bash
# Use flex service tier
harper-agent --flex-tier
```

Forcing the `flex` tier can help reduce costs, although it may result in more frequent errors during periods of high system load.

You can also set this via the `HARPER_AGENT_FLEX_TIER=true` environment variable.

### Ollama Support (Local Models)

To use local models with [Ollama](https://ollama.com/), use the `ollama-` prefix:

```bash
# Use Llama 3 via Ollama
harper-agent --model ollama-qwen2.5-coder
```

If your Ollama instance is running on a custom URL, you can set the `OLLAMA_BASE_URL` environment variable:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
harper-agent --model ollama-qwen2.5-coder
```

### OpenAI API Key Permissions

If you are using a restricted API key, ensure the following permissions are enabled:

- **Models**: `Write` access for `gpt-5.2` (the main model) and `gpt-5-nano` (the memory summarizer)
- **Model capabilities**: `Write` (to allow tool calling and completions).

No other permissions (like Assistants, Threads, or Files) are required as `harper-agent` runs its tools locally.

# Contributing to Our Development

If you want to help us advance the source code that powers harper-agent, take a look at the steps below!

## Local Development

### Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your API key:
   ```env
   OPENAI_API_KEY=your_api_key_here
   # OR ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
   HARPER_AGENT_SKIP_UPDATE=true
   ```

### Running the Agent

To use the `harper-agent` command globally from your local source so you can use it on other projects:

```bash
npm link
```

Now you can run `harper-agent` from any directory.
