import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export const closeThisItemOpenedTabsCallback = async (
    item?: FolderItem | FileItem
) => {
    if (!item) {
        return;
    }
    const numberOfThisOpenedTabs = item.openedTabs.length;
    await vscode.window.tabGroups.close(item.openedTabs, true);
    vscode.window.showInformationMessage(`Closed ${numberOfThisOpenedTabs} tab(s).`);
}

export class TabCleanerProvider implements vscode.TreeDataProvider<FolderItem | FileItem> {
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | FolderItem | FileItem | (FolderItem | FileItem)[] | null | undefined>()
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    constructor(public readonly workspaceRoot: string | undefined) {}

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: FolderItem | FileItem) {
        return element;
    }

    getChildren(element?: FolderItem | FileItem | undefined) {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Current workspace is empty.'
            );
            return Promise.resolve([]);
        }
        
        const returnList: (FolderItem | FileItem)[] = [];

        if (!element) {
            // element is undefined, the root case
            this.readAndHandleCurrentPath(this.workspaceRoot, returnList);
        } else {
            // specific folder case
            this.readAndHandleCurrentPath(element.itemPath, returnList);
        }

        return Promise.resolve(returnList);
    }

    private readAndHandleCurrentPath(
        currentPath: string, 
        returnList: (FolderItem | FileItem)[]
    ) {
        fs.readdirSync(currentPath, { withFileTypes: true }).forEach(dirent => {
            const thisItemPath = path.join(currentPath, dirent.name);
            if (dirent.isDirectory()) {
                const thisOpenedTabs = this.getOpenedTabsByPath(thisItemPath, true);
                if (thisOpenedTabs.length > 0) {
                    returnList.push(new FolderItem(
                        dirent.name, 
                        `${thisOpenedTabs.length} tab(s)`,
                        thisItemPath,
                        thisOpenedTabs
                    ));
                }
            } else if (dirent.isFile()) {
                const thisOpenedTabs = this.getOpenedTabsByPath(thisItemPath, false);
                if (thisOpenedTabs.length > 0) {
                    returnList.push(new FileItem(
                        dirent.name,
                        thisOpenedTabs.length > 1 ? 
                            `${thisOpenedTabs.length} tab(s)` : '',
                        thisItemPath,
                        thisOpenedTabs
                    ));
                }
            }
            // do not consider other types
        })
    }

    private getOpenedTabsByPath(
        queryPath: string,
        isFolderQueryPath: boolean
    ): vscode.Tab[] {
        // isFolderQueryPath: whether the queryPath is a path of a folder or not
        // if a folder path, match tabs by startsWith
        // if not, match tabs by === (the file case)
        const tabs: vscode.Tab[] = [];

        vscode.window.tabGroups.all.forEach(tabGroup => {
            tabGroup.tabs.forEach(tab => {
                if (
                    tab.input instanceof vscode.TabInputText ||
                    tab.input instanceof vscode.TabInputCustom ||
                    tab.input instanceof vscode.TabInputNotebook
                ) {
                    const tabPath = tab.input.uri.fsPath;
                    const pushThisTab = isFolderQueryPath ?
                        tabPath.startsWith(queryPath) :
                        tabPath === queryPath
                    if (pushThisTab) {
                        tabs.push(tab);
                    }
                }
                // other types of tab do not have the uri property
                // only consider the types of tab above
            });
        });

        return tabs;
    }
}

export class FolderItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly itemPath: string,
        public readonly openedTabs: vscode.Tab[]
    ) {
        // label: the name of the folder
        // description: a string containing the number of tabs belong to this folder
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'tabCleanerItem';
    }
}

export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly itemPath: string,
        public readonly openedTabs: vscode.Tab[]
    ) {
        // we add the description property, 
        // since one file may be opened in multiple tabs
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('file');
        this.contextValue = 'tabCleanerItem';
    }
}