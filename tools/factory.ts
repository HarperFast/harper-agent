import { codeInterpreterTool } from '@openai/agents';
import { createApplyPatchTool } from './files/applyPatchTool';
import { egrepTool } from './files/egrepTool';
import { findTool } from './files/findTool';
import { readDirTool } from './files/readDirTool';
import { readFileTool } from './files/readFileTool';
import { setPatchAutoApproveTool } from './general/setPatchAutoApproveTool';
import { setShellAutoApproveTool } from './general/setShellAutoApproveTool';
import { shellTool } from './general/shell';
import { webTool } from './general/web';
import { gitAddTool } from './git/gitAddTool';
import { gitBranchTool } from './git/gitBranchTool';
import { gitCommitTool } from './git/gitCommitTool';
import { gitLogTool } from './git/gitLogTool';
import { gitStashTool } from './git/gitStashTool';
import { gitStatusTool } from './git/gitStatusTool';
import { gitWorkspaceTool } from './git/gitWorkspaceTool';
import { checkHarperStatusTool } from './harper/checkHarperStatusTool';
import { createNewHarperApplicationTool } from './harper/createNewHarperApplicationTool';
import { getHarperConfigSchemaTool } from './harper/getHarperConfigSchemaTool';
import { getHarperResourceInterfaceTool } from './harper/getHarperResourceInterfaceTool';
import { getHarperSchemaGraphQLTool } from './harper/getHarperSchemaGraphQLTool';
import { getHarperSkillTool } from './harper/getHarperSkillTool';
import { hitHarperAPITool } from './harper/hitHarperAPITool';
import { openHarperInBrowserTool } from './harper/openHarperInBrowserTool';
import { readHarperLogsTool } from './harper/readHarperLogsTool';
import { startHarperTool } from './harper/startHarperTool';
import { stopHarperTool } from './harper/stopHarperTool';

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
		getHarperSkillTool,
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
