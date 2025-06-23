import * as vscode from 'vscode';
import * as pythonVenvs from './pythonVenvs';
import * as jobs from './jobs';
import * as submitOptions from './submitOptions';


export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders ? 
    	vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const jobProvider = new jobs.JobProvider(workspaceRoot);
	const jobTreeView = vscode.window.createTreeView('eh.jobs', {
		treeDataProvider: jobProvider,
		canSelectMany: true
	});
	context.subscriptions.push(jobTreeView);

	const submitOptionProvider = new 
		submitOptions.SubmitOptionProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'eh.submitOptions', submitOptionProvider
	));

	const pythonVenvProvider = new pythonVenvs.PythonVenvProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'eh.pythonVenvs', pythonVenvProvider
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.submit', (item?: jobs.JobItem) => {
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
		'eh.jobs.submitMultiple', () => {
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
		'eh.jobs.refresh', () => {
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.delete', async (item?: jobs.JobItem) => {
			await jobs.deleteCallback(workspaceRoot, item);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.deleteMultiple', async () => {
			await jobs.deleteMultipleCallback(workspaceRoot, jobTreeView.selection);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.showJobOutput', (item?: jobs.JobItem) => {
			jobs.showJobOutputOrErrorCallback(workspaceRoot, '_o.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.showJobError', (item?: jobs.JobItem) => {
			jobs.showJobOutputOrErrorCallback(workspaceRoot, '_e.txt', item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.showJobScript', (item?: jobs.JobItem) => {
			jobs.showJobScriptCallback(workspaceRoot, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.closeAllScriptsAndLogs', jobs.closeAllScriptsAndLogsCallback
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.createJobScriptFromCurrentJobScript', async () => {
			await jobs.createJobScriptFromCurrentJobScriptCallback(workspaceRoot);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.submitOptions.setCurrentSubmitOption', (
			item?: submitOptions.SubmitOptionItem
		) => {
			submitOptions.setCurrentSubmitOptionCallback(submitOptionProvider, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.submitOptions.addSubmitOption', async () => {
			// addSubmitOptionCallback is async
			// be sure to await it here
			await submitOptions.addSubmitOptionCallback();
			submitOptionProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.submitOptions.deleteSubmitOption', (
			itemToDelete?: submitOptions.SubmitOptionItem
		) => {
			submitOptions.deleteSubmitOptionCallback(
				submitOptionProvider, itemToDelete
			);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.submitOptions.refresh', () => {
			submitOptionProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.refresh', () => {
			pythonVenvProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.activate', (item?: pythonVenvs.PythonVenvItem) => {
			pythonVenvs.activateCallback(item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.deactivate', pythonVenvs.deactivateCallback
	));
}

// This method is called when your extension is deactivated
export function deactivate() {}
