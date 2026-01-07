#!/usr/bin/env /Users/dawson/.nvm/versions/node/v24.11.1/bin/node
import 'dotenv/config';
import {Agent, MemorySession, run} from '@openai/agents';
import chalk from 'chalk';
import {askQuestion} from './utils/askQuestion.ts';
import {harperResponse} from './utils/harperResponse.ts';
import {createTools} from './tools/factory.ts';
import {spinner} from './utils/spinner.ts';

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

        const stream = await run(
            agent,
            task,
            {
                session,
                stream: true,
            }
        );

        let hasStartedResponse = false;
        let atStartOfLine = true;

        for await (const event of stream) {
            if (event.type === 'raw_model_stream_event') {
                const data = event.data as any;
                if (data.type === 'response_started') {
                    if (!atStartOfLine) {
                        process.stdout.write('\n');
                        atStartOfLine = true;
                    }
                    spinner.start();
                } else if (data.type === 'output_text_delta') {
                    spinner.stop();
                    if (!hasStartedResponse) {
                        process.stdout.write(`${chalk.bold('Harper:')} `);
                        hasStartedResponse = true;
                    }
                    process.stdout.write(chalk.cyan(data.delta));
                    atStartOfLine = data.delta.endsWith('\n');
                } else if (data.type === 'response_done') {
                    spinner.stop();
                    atStartOfLine = true;
                }
            } else if (event.type === 'agent_updated_stream_event') {
                spinner.stop();
                console.log(`\n${chalk.magenta('👤')} ${chalk.bold('Agent switched to:')} ${chalk.italic(event.agent.name)}`);
                atStartOfLine = true;
                spinner.start();
            } else if (event.type === 'run_item_stream_event') {
                if (event.name === 'tool_called') {
                    spinner.stop();
                    const item = event.item.rawItem ?? event.item;
                    const name = item.name || item.type || 'tool';
                    let args = item.arguments || '';
                    if (typeof args !== 'string') args = JSON.stringify(args);
                    const displayArgs = args && args.length <= 80 ? `(${args})` : '';
                    // console.log(item);
                    console.log(`\n${chalk.yellow('🛠️')}  ${chalk.cyan(name)}${chalk.dim(displayArgs)}`);
                    atStartOfLine = true;
                    spinner.start();
                }
            }
        }
        spinner.stop();
        if (!atStartOfLine || hasStartedResponse) {
            process.stdout.write('\n\n');
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
