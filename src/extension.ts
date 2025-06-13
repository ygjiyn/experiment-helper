import * as vscode from 'vscode';
import * as pythonVenvs from './pythonVenvs';

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

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.refresh', () => {
			pythonVenvs.refreshCallback(pythonVenvProvider);
		}
	))

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.activate', (item?: pythonVenvs.PythonVenvItem) => {
			pythonVenvs.activateCallback(item);
		}
	))

	context.subscriptions.push(vscode.commands.registerCommand(
		'eh.pythonVenvs.deactivate', pythonVenvs.deactivateCallback
	))
}

// This method is called when your extension is deactivated
export function deactivate() {}
