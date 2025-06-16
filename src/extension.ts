import * as vscode from 'vscode';
import * as pythonVenvs from './pythonVenvs';
import * as jobs from './jobs';
import * as jobSubmitOptions from './jobSubmitOptions';


export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders ? 
    	vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const pythonVenvProvider = new pythonVenvs.PythonVenvProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'eh.pythonVenvs', pythonVenvProvider
	));

	const jobProvider = new jobs.JobProvider(workspaceRoot);
	const jobTreeView = vscode.window.createTreeView('eh.jobs', {
		treeDataProvider: jobProvider,
		canSelectMany: true
	});
	context.subscriptions.push(jobTreeView);

	const jobSubmitOptionProvider = new 
		jobSubmitOptions.JobSubmitOptionProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'eh.jobSubmitOptions', jobSubmitOptionProvider
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.refresh', () => {
			pythonVenvs.refreshCallback(pythonVenvProvider);
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

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.submit', (item?: jobs.JobItem) => {
			const currentSubmitOption = jobSubmitOptionProvider.getCurrentSubmitOption();
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
			const currentSubmitOption = jobSubmitOptionProvider.getCurrentSubmitOption();
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
		'eh.jobs.delete', (item?: jobs.JobItem) => {
			jobs.deleteCallback(workspaceRoot, item);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.deleteMultiple', () => {
			jobs.deleteMultipleCallback(workspaceRoot, jobTreeView.selection);
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
		'eh.jobs.createJobScriptFromCurrentJobScript', () => {
			jobs.createJobScriptFromCurrentJobScriptCallback(workspaceRoot);
			jobProvider.refresh();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobSubmitOptions.setCurrentSubmitOption', (
			item?: jobSubmitOptions.JobSubmitOptionItem
		) => {
			jobSubmitOptions.setCurrentSubmitOptionCallback(jobSubmitOptionProvider, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobSubmitOptions.addSubmitOption', () => {
			jobSubmitOptions.addSubmitOptionCallback(jobSubmitOptionProvider);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobSubmitOptions.deleteSubmitOption', (
			itemToDelete?: jobSubmitOptions.JobSubmitOptionItem
		) => {
			jobSubmitOptions.deleteSubmitOptionCallback(
				jobSubmitOptionProvider, itemToDelete
			);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobSubmitOptions.refresh', () => {
			jobSubmitOptionProvider.refresh();
		}
	));
}

// This method is called when your extension is deactivated
export function deactivate() {}
