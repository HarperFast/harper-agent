import { codeInterpreterTool } from '@openai/agents';
import { createApplyPatchTool } from './files/applyPatchTool.ts';
import { egrepTool } from './files/egrepTool.ts';
import { findTool } from './files/findTool.ts';
import { readDirTool } from './files/readDirTool.ts';
import { readFileTool } from './files/readFileTool.ts';
import { setPatchAutoApproveTool } from './general/setPatchAutoApproveTool.ts';
import { setShellAutoApproveTool } from './general/setShellAutoApproveTool.ts';
import { shellTool } from './general/shell.ts';
import { webTool } from './general/web.ts';
import { gitAddTool } from './git/gitAddTool.ts';
import { gitBranchTool } from './git/gitBranchTool.ts';
import { gitCommitTool } from './git/gitCommitTool.ts';
import { gitLogTool } from './git/gitLogTool.ts';
import { gitStashTool } from './git/gitStashTool.ts';
import { gitStatusTool } from './git/gitStatusTool.ts';
import { gitWorkspaceTool } from './git/gitWorkspaceTool.ts';
import { checkHarperStatusTool } from './harper/checkHarperStatusTool.ts';
import { createNewHarperApplicationTool } from './harper/createNewHarperApplicationTool.ts';
import { getHarperConfigSchemaTool } from './harper/getHarperConfigSchemaTool.ts';
import { getHarperResourceInterfaceTool } from './harper/getHarperResourceInterfaceTool.ts';
import { getHarperSchemaGraphQLTool } from './harper/getHarperSchemaGraphQLTool.ts';
import { hitHarperAPITool } from './harper/hitHarperAPITool.ts';
import { openHarperInBrowserTool } from './harper/openHarperInBrowserTool.ts';
import { readHarperLogsTool } from './harper/readHarperLogsTool.ts';
import { startHarperTool } from './harper/startHarperTool.ts';
import { stopHarperTool } from './harper/stopHarperTool.ts';

export function createTools() {
	return [
		checkHarperStatusTool,
		codeInterpreterTool(),
		createApplyPatchTool(),
		createNewHarperApplicationTool,
		egrepTool,
		findTool,
		getHarperConfigSchemaTool,
		getHarperResourceInterfaceTool,
		getHarperSchemaGraphQLTool,
		gitAddTool,
		gitBranchTool,
		gitCommitTool,
		gitLogTool,
		gitStashTool,
		gitStatusTool,
		gitWorkspaceTool,
		hitHarperAPITool,
		openHarperInBrowserTool,
		readDirTool,
		readFileTool,
		readHarperLogsTool,
		setPatchAutoApproveTool,
		setShellAutoApproveTool,
		shellTool,
		startHarperTool,
		stopHarperTool,
		webTool,
	];
}
