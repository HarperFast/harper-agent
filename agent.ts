import {Agent, MemorySession, run} from '@openai/agents';
import chalk from 'chalk';
import {askQuestion} from './utils/askQuestion.ts';
import {createApplyPatchTool} from "./tools/applyPatchTool.ts";
import {harperResponse} from "./utils/harperResponse.ts";

async function main() {
    const workspaceRoot = process.cwd();
    console.log(chalk.dim(`Working directory: ${chalk.cyan(workspaceRoot)}`));
    console.log(chalk.dim(`Press Ctrl+C or hit enter twice to exit.\n`));
    const agent = new Agent({
        name: 'Patch Assistant',
        model: 'gpt-5.2',
        instructions: `You can edit files inside ${workspaceRoot} using the apply_patch tool.`,
        tools: [
            createApplyPatchTool(workspaceRoot),
        ],
    });

    harperResponse('How can I assist you today?');

    const session = new MemorySession();
    let emptyLines = 0;

    while (true) {
        const task = await askQuestion('> ');
        if (!task) {
            emptyLines += 1;
            if (emptyLines >= 2) {
                harperResponse('See you later!');
                process.exit(0);
            }
            continue;
        }
        emptyLines = 0;

        const result = await run(
            agent,
            task,
            {session}
        );
        harperResponse(result.finalOutput);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
