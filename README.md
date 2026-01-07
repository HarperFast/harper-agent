# Hairper

AI to help you with Harper app management.

## Prerequisites

- Node.js (v20 or higher recommended)
- OpenAI API Key

## Local Development

### Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_AGENTS_DISABLE_TRACING=1
   ```

### Running the Agent

To run the agent locally during development:

```bash
npm start
```

Or with watch mode:

```bash
npm run dev
```

### Installing as a Global CLI

To use the `hairper` command globally from your local source:

```bash
npm link
```

Now you can run `hairper` from any directory.

## Usage

Once installed or running, you can ask Hairper to help you with tasks in your current directory, such as applying patches or managing your Harper application.

Press `Ctrl+C` or hit enter twice to exit.
