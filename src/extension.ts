import * as vscode from 'vscode';
import * as jobControlProviders from './job-control/providers';
import * as jobControlCommands from './job-control/commands';
import * as jobConfigProviders from './job-config/providers';
import * as jobConfigCommands from './job-config/commands';
import * as otherToolsCommands from './other-tools/commands';


export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders ? 
    	vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const jobControlProvider = new jobControlProviders.JobControlProvider(workspaceRoot);
	const jobControlTreeView = vscode.window.createTreeView('experimentHelper.jobControl', {
		treeDataProvider: jobControlProvider,
		canSelectMany: true
	});
	context.subscriptions.push(jobControlTreeView);

	const jobStatusDetailsProvider = 
		new jobControlProviders.JobStatusDetailsProvider(workspaceRoot);
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(
		jobControlProviders.JobStatusDetailsScheme, 
		jobStatusDetailsProvider
	));

	const jobConfigProvider = 
		new jobConfigProviders.JobConfigProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'experimentHelper.jobConfig', jobConfigProvider
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.submitSingleJob', 
		(item: jobControlProviders.JobItem) => {
			const currentJobConfig = jobConfigProvider.getCurrentJobConfig();
			jobControlCommands.submitSingleJob(
				workspaceRoot,
				currentJobConfig?.content,
				item
			);
			jobControlProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.submitMultipleJobs', 
		() => {
			const currentJobConfig = jobConfigProvider.getCurrentJobConfig();
			jobControlCommands.submitMultipleJobs(
				workspaceRoot, 
				currentJobConfig?.content,
				jobControlTreeView.selection
			);
			jobControlProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.refresh', 
		() => {
			jobControlProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.deleteSingleJob', 
		async (item: jobControlProviders.JobItem) => {
			await jobControlCommands.deleteSingleJob(workspaceRoot, item);
			jobControlProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.deleteMultipleJobs', 
		async () => {
			await jobControlCommands.deleteMultipleJobs(workspaceRoot, jobControlTreeView.selection);
			jobControlProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.showJobOutput', 
		(item: jobControlProviders.JobItem) => {
			jobControlCommands.showJobOutputOrError(workspaceRoot, '_o.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.showJobError', 
		(item: jobControlProviders.JobItem) => {
			jobControlCommands.showJobOutputOrError(workspaceRoot, '_e.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.showJobScript', 
		(item: jobControlProviders.JobItem) => {
			jobControlCommands.showJobScript(workspaceRoot, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.showJobStatusDetails', 
		(item: jobControlProviders.JobItem) => {
			jobControlCommands.showJobStatusDetails(item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobControl.copyJupyterUrlToClipboard', 
		(item: jobControlProviders.JobItem) => {
			jobControlCommands.copyJupyterUrlToClipboard(item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobConfig.setCurrentJobConfig', 
		(item: jobConfigProviders.JobConfigItem) => {
			jobConfigProvider.setCurrentJobConfig(item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobConfig.addJobConfig', 
		async () => {
			// addJobConfig is async
			// be sure to await it here
			await jobConfigCommands.addJobConfig();
			jobConfigProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobConfig.deleteJobConfig', 
		(itemToDelete: jobConfigProviders.JobConfigItem) => {
			jobConfigCommands.deleteJobConfig(
				jobConfigProvider, itemToDelete
			);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.jobConfig.refresh', () => {
			jobConfigProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experimentHelper.otherTools.ChangeTerminalDirectoryToWorkspaceRoot', () => {
			otherToolsCommands.ChangeTerminalDirectoryToWorkspaceRoot(workspaceRoot);
		}
	));
}

// This method is called when your extension is deactivated
export function deactivate() {}
