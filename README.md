![](assets/baileys-awesome-logo-for-hairper.png) ![npx -y hairper](./README.svg)

AI to help you with Harper app creation and management.

## Prerequisites

- Node.js (v24 or higher recommended)
- An API key for your preferred AI model:
  - **OpenAI**: https://platform.openai.com/api-keys
  - **Anthropic**: https://console.anthropic.com/settings/keys
  - **Google Gemini**: https://aistudio.google.com/app/apikey
  - **Ollama**: (No API key required, see [Ollama Support](#ollama-support-local-models) below)

## Getting Started

When you first run `hairper`, it will prompt you for an API key if one is not found in your environment. It will then automatically save it to a `.env` file in your current working directory.

If you prefer to set it manually, you can create a `.env` file:

```bash
# For OpenAI (default)
OPENAI_API_KEY=your_api_key_here

# For Anthropic
ANTHROPIC_API_KEY=your_api_key_here

# For Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

(If you'd rather export these environment variables from within your .zshrc or equivalent file, you can do that instead.)

Now install hairper:

```bash
npm install -g hairper
```

Or run it with npx:

```
npx -y hairper
```

You're ready to go!

```bash
> hairper

Working directory: /Users/dawson/Code/softwork-beats
Harper app detected: Yes
Press Ctrl+C or hit enter twice to exit.

Harper: What do you want to do together today?

>
```

## Model Selection

By default, `hairper` uses OpenAI. You can switch to other models using the `--model` (or `-m`) flag:

```bash
# Use Claude 3.5 Sonnet
hairper --model claude-3-5-sonnet-20241022

# Use Gemini 1.5 Pro
hairper --model gemini-1.5-pro

# Use a specific OpenAI model
hairper --model gpt-4o-mini
```

You can also set the default model via the `HAIRPER_MODEL` environment variable.

### Compaction Model

By default, `hairper` uses `gpt-4o-mini` for session memory compaction. You can switch this to another model using the `--compaction-model` (or `-c`) flag:

```bash
# Use a different compaction model
hairper --compaction-model claude-3-haiku-20240307
```

> [!NOTE]
> Conversation compaction is currently only enabled when using an OpenAI model as the primary model. For non-OpenAI models (Anthropic, Google, Ollama), compaction is disabled to ensure compatibility with their respective SDKs.

You can also set the default compaction model via the `HAIRPER_COMPACTION_MODEL` environment variable.

### Session Persistence

By default, `hairper` uses an in-memory session that is lost when you exit. You can persist your chat session to a SQLite database on disk using the `--session` (or `-s`) flag:

```bash
# Persist session to a file
hairper --session ./my-session.db
```

This will save all conversation history to the specified file. If the file already exists, `hairper` will resume the session from where you left off.

You can also set the default session path via the `HAIRPER_SESSION` environment variable.

### Service Tier (OpenAI Only)

By default, `hairper` uses the `auto` service tier. You can force the `flex` tier to be used with the `--flex-tier` flag:

```bash
# Use flex service tier
hairper --flex-tier
```

Forcing the `flex` tier can help reduce costs, although it may result in more frequent errors during periods of high system load.

You can also set this via the `HAIRPER_FLEX_TIER=true` environment variable.

### Ollama Support (Local Models)

To use local models with [Ollama](https://ollama.com/), use the `ollama-` prefix:

```bash
# Use Llama 3 via Ollama
hairper --model ollama-llama3
```

If your Ollama instance is running on a custom URL, you can set the `OLLAMA_BASE_URL` environment variable:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
hairper --model ollama-llama3
```

### OpenAI API Key Permissions

If you are using a restricted API key, ensure the following permissions are enabled:

- **Models**: `Write` access for `gpt-5.2` (the main model) and `gpt-4o-mini` (the memory summarizer)
- **Model capabilities**: `Write` (to allow tool calling and completions).

No other permissions (like Assistants, Threads, or Files) are required as `hairper` runs its tools locally.

# Contributing to Hairper's Development

If you want to help us advance the source code that powers Hairper, take a look at the steps below!

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
   HAIRPER_SKIP_UPDATE=true
   ```

### Running the Agent

To use the `hairper` command globally from your local source so you can use it on other projects:

```bash
npm link
```

Now you can run `hairper` from any directory.

## Usage

Once installed or running, you can ask Hairper to help you with tasks in your current directory, such as applying patches or managing your Harper application.

Press `Ctrl+C` or hit enter twice to exit.
