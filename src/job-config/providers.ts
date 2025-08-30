import * as vscode from 'vscode';


export class JobConfigProvider 
    implements vscode.TreeDataProvider<JobConfigItem> {

    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | JobConfigItem | JobConfigItem[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    private currentJobConfigName: string | undefined = undefined;
    private jobConfigNameToItem: Map<string, JobConfigItem> = new Map();

    constructor(public readonly workspaceRoot: string | undefined) { }

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: JobConfigItem) {
        return element;
    }

    getChildren(element: JobConfigItem | undefined) {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Open a workspace first.'
            );
            return Promise.resolve([]);
        }

        if (!element) {
            this.jobConfigNameToItem = new Map();
            const jobConfigNamesAndContents = vscode.workspace.getConfiguration()
                .get('experimentHelper.JobConfig.JobConfigNamesAndContents') as string[];
            jobConfigNamesAndContents.forEach((nameAndContent) => {
                const [name, content] = nameAndContent.split(':');
                this.jobConfigNameToItem.set(
                    name, new JobConfigItem(
                        name, content, name === this.currentJobConfigName
                    )
                );
            });
            return Promise.resolve(Array.from(this.jobConfigNameToItem.values()));
        } else {
            return Promise.resolve([]);
        }
    }

    getCurrentJobConfig() {
        return this.currentJobConfigName ?
            this.jobConfigNameToItem.get(this.currentJobConfigName) : undefined;
    }

    setCurrentJobConfig(jobConfigItem: JobConfigItem | undefined) {
        this.currentJobConfigName =
            jobConfigItem ? jobConfigItem.name : undefined;
        this.refresh();
    }
}


export class JobConfigItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly content: string,
        isCurrent: boolean
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.label = name;
        this.description = content;
        this.tooltip = content;
        this.contextValue = 'JobConfigItem';
        this.iconPath = isCurrent ?
            new vscode.ThemeIcon('circle-filled') :
            new vscode.ThemeIcon('circle-outline');
        // TODO no need to register this command in package.json
        this.command = {
            command: 'experimentHelper.JobConfig.setCurrentJobConfig',
            title: 'Set Current Submit Option',
            arguments: [this]
        };
    }
}
