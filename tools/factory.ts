import { codeInterpreterTool } from '@openai/agents';
import { createApplyPatchTool } from './files/applyPatchTool.ts';
import { egrepTool } from './files/egrepTool.ts';
import { findTool } from './files/findTool.ts';
import { readDirTool } from './files/readDirTool.ts';
import { readFileTool } from './files/readFileTool.ts';
import { shellTool } from './general/shell.ts';
import { webTool } from './general/web.ts';
import { gitAddTool } from './git/gitAddTool.ts';
import { gitBranchTool } from './git/gitBranchTool.ts';
import { gitCommitTool } from './git/gitCommitTool.ts';
import { gitLogTool } from './git/gitLogTool.ts';
import { gitStashTool } from './git/gitStashTool.ts';
import { gitStatusTool } from './git/gitStatusTool.ts';
import { gitWorkspaceTool } from './git/gitWorkspaceTool.ts';
import { createNewHarperApplicationTool } from './harper/createNewHarperApplicationTool.ts';
import { openBrowserTool } from './harper/openBrowserTool.ts';
import { readHarperLogsTool } from './harper/readHarperLogsTool.ts';
import { readHarperOpenAPISpecTool } from './harper/readHarperOpenAPISpecTool.ts';
import { startHarperTool } from './harper/startHarperTool.ts';
import { stopHarperTool } from './harper/stopHarperTool.ts';

export function createTools() {
	return [
		codeInterpreterTool(),
		createApplyPatchTool(),
		createNewHarperApplicationTool,
		egrepTool,
		findTool,
		gitAddTool,
		gitBranchTool,
		gitCommitTool,
		gitLogTool,
		gitStashTool,
		gitStatusTool,
		gitWorkspaceTool,
		openBrowserTool,
		readDirTool,
		readFileTool,
		readHarperLogsTool,
		readHarperOpenAPISpecTool,
		shellTool,
		startHarperTool,
		stopHarperTool,
		webTool,
	];
}
