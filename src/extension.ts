import * as vscode from 'vscode';
import * as pythonVenvs from './pythonVenvs';
import * as jobs from './jobs';


export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders ? 
    	vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const disposable = vscode.commands.registerCommand('experiment-helper.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Experiment Helper!');
	});

	context.subscriptions.push(disposable);

	const pythonVenvProvider = new pythonVenvs.PythonVenvProvider(workspaceRoot);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'eh.pythonVenvs', pythonVenvProvider));

	const jobProvider = new jobs.JobProvider(workspaceRoot);
	const jobTreeView = vscode.window.createTreeView('eh.jobs', {
		treeDataProvider: jobProvider,
		canSelectMany: true
	});
	context.subscriptions.push(jobTreeView);

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
			jobs.submitCallback(workspaceRoot, jobProvider, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.submitMultiple', () => {
			jobs.submitMultipleCallback(workspaceRoot, jobTreeView, jobProvider);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.refresh', () => {
			jobs.refreshCallback(jobProvider);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.delete', (item?: jobs.JobItem) => {
			jobs.deleteCallback(workspaceRoot, jobProvider, item);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.jobs.deleteMultiple', () => {
			jobs.deleteMultipleCallback(workspaceRoot, jobTreeView, jobProvider);
		}
	));
}

// This method is called when your extension is deactivated
export function deactivate() {}
