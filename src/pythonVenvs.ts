import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export const activateCallback = (item?: PythonVenvItem) => {
    if (item) {
        const activatePath = path.join(item.itemPath, 'bin', 'activate');
        vscode.window.activeTerminal?.sendText(`. ${activatePath}`);
    }
}

export const deactivateCallback = () => {
    vscode.window.activeTerminal?.sendText('deactivate');
}

export class PythonVenvProvider implements vscode.TreeDataProvider<PythonVenvItem> {
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | PythonVenvItem | PythonVenvItem[] | null | undefined>();

    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    constructor(public readonly workspaceRoot: string | undefined) {}

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: PythonVenvItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: PythonVenvItem | undefined): vscode.ProviderResult<PythonVenvItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Open a workspace first.'
			);
			return Promise.resolve([]);
        }
        if (!element) {
            const workspaceFiles = fs.readdirSync(this.workspaceRoot);
            const pythonVenvPrefix = vscode.workspace.getConfiguration()
                .get('eh.pythonVenvs.venvFolderPrefix') as string;
            const pythonVenvItemList: PythonVenvItem[] = [];
            workspaceFiles.forEach((fileName) => {
                if (fileName.startsWith(pythonVenvPrefix)) {
                    pythonVenvItemList.push(new PythonVenvItem(
                        fileName,
                        path.join(this.workspaceRoot as string, fileName)
                    ));
                }
            })
            return Promise.resolve(pythonVenvItemList);
        }
    }
}

export class PythonVenvItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly itemPath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'pythonVenvItem';
        this.iconPath = new vscode.ThemeIcon('symbol-folder');
        this.command = {
            command: 'eh.pythonVenvs.activate',
            title: 'Activate Python Venv',
            arguments: [this]
        }
    }
}