import {codeInterpreterTool} from '@openai/agents';
import {createApplyPatchTool} from './applyPatchTool.ts';
import {createNewHarperApplicationTool} from './createNewHarperApplicationTool.ts';
import {egrepTool} from './egrepTool.ts';
import {findTool} from './findTool.ts';
import {readDirTool} from './readDirTool.ts';
import {readFileTool} from './readFileTool.ts';

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
