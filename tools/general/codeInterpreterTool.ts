import { type RunContext, tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import { trackedState } from '../../lifecycle/trackedState';
import { getEnv } from '../../utils/getEnv';

const execAsync = promisify(exec);

const CodeInterpreterParameters = z.object({
	code: z.string().describe('The code to execute.'),
	language: z.enum(['python', 'javascript']).optional().default('python').describe(
		'The programming language of the code.',
	),
});

export const codeInterpreterTool = tool({
	name: 'code_interpreter',
	description:
		'Executes Python or JavaScript code in a local environment. This is useful for data analysis, complex calculations, and more. All code will be executed in the current workspace.',
	parameters: CodeInterpreterParameters,
	execute,
	needsApproval,
});

export async function needsApproval(
	runContext: Pick<RunContext, 'isToolApproved'>,
	parameters: z.infer<typeof CodeInterpreterParameters>,
	callId?: string,
) {
	if (callId && runContext.isToolApproved({ toolName: 'code_interpreter', callId })) {
		return false;
	}

	const autoApproved = getEnv('HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER', 'CODE_INTERPRETER_AUTO_APPROVE') === '1';

	if (autoApproved) {
		return false;
	}

	emitToListeners('OpenApprovalViewer', {
		type: 'code_interpreter',
		code: parameters.code,
		mode: 'ask',
		callId,
	});

	return true;
}

export async function execute({ code, language }: z.infer<typeof CodeInterpreterParameters>) {
	const extension = language === 'javascript' ? 'js' : 'py';
	const interpreter = language === 'javascript' ? 'node' : 'python3';
	const tempFile = path.join(trackedState.cwd, `.temp_code_${Date.now()}.${extension}`);
	try {
		await writeFile(tempFile, code, 'utf8');
		const { stdout, stderr } = await execAsync(`${interpreter} ${tempFile}`);
		return `STDOUT:\n${stdout}\nSTDERR:\n${stderr}`;
	} catch (error: any) {
		return `Error executing code: ${error.message}\nSTDOUT: ${error.stdout || ''}\nSTDERR: ${error.stderr || ''}`;
	} finally {
		await unlink(tempFile).catch(() => {});
	}
}
