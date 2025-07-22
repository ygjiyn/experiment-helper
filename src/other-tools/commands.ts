import * as vscode from 'vscode';


export const terminalComputationNodeLoginCallback = () => {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        vscode.window.showInformationMessage('No active terminal.');
        return;
    }
    terminal.sendText('qlogin');
}

export const terminalChangeDirectoryToWorkspaceRootCallback = (
    workspaceRoot: string | undefined
) => {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        vscode.window.showInformationMessage('No active terminal.');
        return;
    }
    if (!workspaceRoot) {
        vscode.window.showInformationMessage('Current workspace is empty.');
        return;
    }
    terminal.sendText(`cd ${workspaceRoot}`);
}
