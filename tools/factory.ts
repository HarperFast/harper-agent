import {codeInterpreterTool} from '@openai/agents';
import {createApplyPatchTool} from './files/applyPatchTool.ts';
import {createNewHarperApplicationTool} from './harper/createNewHarperApplicationTool.ts';
import {egrepTool} from './files/egrepTool.ts';
import {findTool} from './files/findTool.ts';
import {readDirTool} from './files/readDirTool.ts';
import {readFileTool} from './files/readFileTool.ts';

export function createTools() {
	return [
		codeInterpreterTool(),
		createApplyPatchTool(),
		createNewHarperApplicationTool,
		egrepTool,
		findTool,
		readDirTool,
		readFileTool,
	];
}
