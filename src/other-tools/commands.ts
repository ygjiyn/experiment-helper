import * as vscode from 'vscode';

export function ChangeTerminalDirectoryToWorkspaceRoot(workspaceRoot: string | undefined) {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        vscode.window.showInformationMessage('No active terminal.');
        return;
    }
    if (!workspaceRoot) {
        vscode.window.showInformationMessage('Open a workspace first.');
        return;
    }
    terminal.sendText(`cd ${workspaceRoot}`);
}
