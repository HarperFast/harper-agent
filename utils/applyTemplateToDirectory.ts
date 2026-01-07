import * as unzipper from 'unzipper';
import {dirname, join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';

export async function applyTemplateToDirectory(directoryName: string) {
	const response = await fetch('https://github.com/HarperFast/application-template/zipball/main/');
	if (!response.ok) {
		return `Error: Failed to download template: ${response.statusText} (${response.status})`;
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const directory = await unzipper.Open.buffer(buffer);
	for (const file of directory.files) {
		if (file.type === 'File') {
			const content = await file.buffer();
			const intoPath = join(directoryName, file.path.split('/').slice(1).join('/'));
			const dirName = dirname(intoPath);
			await mkdir(dirName, {recursive: true});
			await writeFile(intoPath, content);
		}
	}
}
