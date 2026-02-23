import { browserClickTool } from './browser/browserClickTool';
import { browserCloseTool } from './browser/browserCloseTool';
import { browserEvaluateTool } from './browser/browserEvaluateTool';
import { browserGetContentTool } from './browser/browserGetContentTool';
import { browserGetLogsTool } from './browser/browserGetLogsTool';
import { browserIsElementPresentTool } from './browser/browserIsElementPresentTool';
import { browserNavigateTool } from './browser/browserNavigateTool';
import { browserScreenshotTool } from './browser/browserScreenshotTool';
import { browserTypeTool } from './browser/browserTypeTool';
import { createApplyPatchTool } from './files/applyPatchTool';
import { changeCwdTool } from './files/changeCwdTool';
import { egrepTool } from './files/egrepTool';
import { findTool } from './files/findTool';
import { readDirTool } from './files/readDirTool';
import { readFileTool } from './files/readFileTool';
import { codeInterpreterTool } from './general/codeInterpreterTool';
import { collectFeedbackTool } from './general/collectFeedbackTool';
import { setInterpreterAutoApproveTool } from './general/setInterpreterAutoApproveTool';
import { setPatchAutoApproveTool } from './general/setPatchAutoApproveTool';
import { setShellAutoApproveTool } from './general/setShellAutoApproveTool';
import { shellTool } from './general/shellTool';
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
import { readHarperLogsTool } from './harper/readHarperLogsTool';
import { startHarperTool } from './harper/startHarperTool';
import { stopHarperTool } from './harper/stopHarperTool';
import { addPlanItemTool } from './plan/addPlanItemTool';
import { setPlanDescriptionTool } from './plan/setPlanDescriptionTool';
import { setPlanItemsTool } from './plan/setPlanItemsTool';
import { updatePlanItemTool } from './plan/updatePlanItemTool';

export function createTools() {
	return [
		browserClickTool,
		browserCloseTool,
		browserEvaluateTool,
		browserGetContentTool,
		browserGetLogsTool,
		browserIsElementPresentTool,
		browserNavigateTool,
		browserScreenshotTool,
		browserTypeTool,
		addPlanItemTool,
		changeCwdTool,
		checkHarperStatusTool,
		collectFeedbackTool,
		codeInterpreterTool,
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
		readDirTool,
		readFileTool,
		readHarperLogsTool,
		setInterpreterAutoApproveTool,
		setPatchAutoApproveTool,
		setPlanDescriptionTool,
		setPlanItemsTool,
		setShellAutoApproveTool,
		shellTool,
		startHarperTool,
		stopHarperTool,
		updatePlanItemTool,
	];
}
