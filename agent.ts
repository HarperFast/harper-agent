#!/usr/bin/env /Users/dawson/.nvm/versions/node/v24.11.1/bin/node
import 'dotenv/config';
import {Agent, MemorySession, run} from '@openai/agents';
import chalk from 'chalk';
import {askQuestion} from './utils/askQuestion.ts';
import {harperResponse} from './utils/harperResponse.ts';
import {createTools} from './tools/factory.ts';

async function main() {
    if (!process.env['OPENAI_API_KEY']) {
        harperResponse(chalk.red('Error: OPENAI_API_KEY is not set.'));
        console.log(`Please set it in your environment or in a ${chalk.cyan('.env')} file.`);
        process.exit(1);
    }

    const workspaceRoot = process.cwd();
    console.log(chalk.dim(`Working directory: ${chalk.cyan(workspaceRoot)}`));
    console.log(chalk.dim(`Press Ctrl+C or hit enter twice to exit.\n`));
    const agent = new Agent({
        name: 'Harper App Development Assistant',
        model: 'gpt-5.2',
        instructions: `You are working on creating the harper app in ${workspaceRoot} with the user.`,
        tools: createTools(),
    });

    harperResponse('What kind of Harper app do you want to make together?');

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
