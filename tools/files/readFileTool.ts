import { tool } from '@openai/agents';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { z } from 'zod';
import { trackedState } from '../../lifecycle/trackedState';
import { resolvePath } from '../../utils/files/paths';

const ToolParameters = z.object({
	fileName: z
		.string()
		.describe('The name of the file to read.'),
});

const IMAGE_EXTENSIONS: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
};

export async function execute({ fileName }: z.infer<typeof ToolParameters>) {
	try {
		// If the requested file appears to be a Harper skill markdown, record the skill name
		const normalized = String(fileName).replace(/\\/g, '/');
		const m = normalized.match(/(?:^|\/)skills\/([A-Za-z0-9_-]+)\.md(?:$|[?#])/);
		if (m && m[1]) {
			trackedState.session?.addSkillRead?.(m[1]);
		}
		const resolvedPath = resolvePath(trackedState.cwd, fileName);

		const ext = extname(resolvedPath).toLowerCase();
		if (IMAGE_EXTENSIONS[ext]) {
			const buffer = await readFile(resolvedPath);
			return {
				type: 'image',
				image: `data:${IMAGE_EXTENSIONS[ext]};base64,${buffer.toString('base64')}`,
				detail: 'auto',
			};
		}

		return await readFile(resolvedPath, 'utf8');
	} catch (error) {
		return `Error reading file: ${error}`;
	}
}

export const readFileTool = tool({
	name: 'readFile',
	description: 'Reads the contents of a specified file. If the file is an image, it returns a structured image object.',
	parameters: ToolParameters,
	execute,
});
