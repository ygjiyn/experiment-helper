import * as vscode from 'vscode';
import * as jobs from './jobs/jobs';
import * as submitOptions from './jobs/submitOptions';
import * as tabCleaner from './tools/tabCleaner';


export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders ? 
    	vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const jobProvider = new jobs.JobProvider(workspaceRoot);
	const jobTreeView = vscode.window.createTreeView('experiment-helper.jobs', {
		treeDataProvider: jobProvider,
		canSelectMany: true
	});
	context.subscriptions.push(jobTreeView);

	const jobStatusDetailsProvider = new jobs.JobStatusDetailsProvider(workspaceRoot);
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(
		jobs.JobStatusDetailsScheme, 
		jobStatusDetailsProvider
	));

	const submitOptionProvider = new 
		submitOptions.SubmitOptionProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'experiment-helper.submitOptions', submitOptionProvider
	));

	const tabCleanerProvider = new tabCleaner.TabCleanerProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'experiment-helper.tabCleaner', tabCleanerProvider
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.submit', (item?: jobs.JobItem) => {
			const currentSubmitOption = submitOptionProvider.getCurrentSubmitOption();
			jobs.submitCallback(
				workspaceRoot,
				currentSubmitOption?.content,
				item
			);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.submitMultiple', () => {
			const currentSubmitOption = submitOptionProvider.getCurrentSubmitOption();
			jobs.submitMultipleCallback(
				workspaceRoot, 
				currentSubmitOption?.content,
				jobTreeView.selection
			);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.refresh', () => {
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.delete', async (item?: jobs.JobItem) => {
			await jobs.deleteCallback(workspaceRoot, item);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.deleteMultiple', async () => {
			await jobs.deleteMultipleCallback(workspaceRoot, jobTreeView.selection);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.showJobOutput', (item?: jobs.JobItem) => {
			jobs.showJobOutputOrErrorCallback(workspaceRoot, '_o.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.showJobError', (item?: jobs.JobItem) => {
			jobs.showJobOutputOrErrorCallback(workspaceRoot, '_e.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.showJobScript', (item?: jobs.JobItem) => {
			jobs.showJobScriptCallback(workspaceRoot, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.closeAllScriptsAndLogs', jobs.closeAllScriptsAndLogsCallback
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.createJobScriptFromCurrentJobScript', async () => {
			await jobs.createJobScriptFromCurrentJobScriptCallback(workspaceRoot);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.jobs.showJobStatusDetails', (item?: jobs.JobItem) => {
			jobs.showJobStatusDetailsCallBack(item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.submitOptions.setCurrentSubmitOption', (
			item?: submitOptions.SubmitOptionItem
		) => {
			submitOptions.setCurrentSubmitOptionCallback(submitOptionProvider, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.submitOptions.addSubmitOption', async () => {
			// addSubmitOptionCallback is async
			// be sure to await it here
			await submitOptions.addSubmitOptionCallback();
			submitOptionProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.submitOptions.deleteSubmitOption', (
			itemToDelete?: submitOptions.SubmitOptionItem
		) => {
			submitOptions.deleteSubmitOptionCallback(
				submitOptionProvider, itemToDelete
			);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.submitOptions.refresh', () => {
			submitOptionProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.tabCleaner.refresh', () => {
			tabCleanerProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.tabCleaner.closeThisItemOpenedTabs', async (
			item?: tabCleaner.FolderItem | tabCleaner.FileItem
		) => {
			await tabCleaner.closeThisItemOpenedTabsCallback(item);
			tabCleanerProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'experiment-helper.tabCleaner.closeAllOpenedTabs', async () => {
			await tabCleaner.closeAllOpenedTabsCallback();
			tabCleanerProvider.refresh();
		}
	));
}

// This method is called when your extension is deactivated
export function deactivate() {}
