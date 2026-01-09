import {codeInterpreterTool} from '@openai/agents';
import {createApplyPatchTool} from './files/applyPatchTool.ts';
import {egrepTool} from './files/egrepTool.ts';
import {findTool} from './files/findTool.ts';
import {readDirTool} from './files/readDirTool.ts';
import {readFileTool} from './files/readFileTool.ts';
import {createNewHarperApplicationTool} from './harper/createNewHarperApplicationTool.ts';
import {openBrowserTool} from './harper/openBrowserTool.ts';
import {readHarperLogsTool} from './harper/readHarperLogsTool.ts';
import {readHarperOpenAPISpecTool} from './harper/readHarperOpenAPISpecTool.ts';
import {startHarperTool} from './harper/startHarperTool.ts';
import {stopHarperTool} from './harper/stopHarperTool.ts';

export function createTools() {
	return [
		codeInterpreterTool(),
		createApplyPatchTool(),
		createNewHarperApplicationTool,
		egrepTool,
		findTool,
		openBrowserTool,
		readDirTool,
		readFileTool,
		readHarperLogsTool,
		readHarperOpenAPISpecTool,
		startHarperTool,
		stopHarperTool,
	];
}
