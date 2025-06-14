import * as vscode from 'vscode';


export const setCurrentSubmitOptionCallback = (
    jobSubmitOptionProvider: JobSubmitOptionProvider,
    submitOptionItem?: JobSubmitOptionItem
) => {
    if (!submitOptionItem) {
        return;
    }
    jobSubmitOptionProvider.setCurrentSubmitOption(submitOptionItem);
}

export class JobSubmitOptionProvider 
    implements vscode.TreeDataProvider<JobSubmitOptionItem> {
    
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | JobSubmitOptionItem | JobSubmitOptionItem[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    private currentSubmitOptionName: string | undefined = undefined;
    private jobSubmitOptionNameToItem: Map<string, JobSubmitOptionItem> = new Map();
    
    constructor(public readonly workspaceRoot: string | undefined) {}
    
    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: JobSubmitOptionItem): 
        vscode.TreeItem | Thenable<vscode.TreeItem> {
        
        return element;
    }

    getChildren(element?: JobSubmitOptionItem | undefined): 
        vscode.ProviderResult<JobSubmitOptionItem[]> {
        
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Current workspace is empty. Open a workspace first.'
            );
            return Promise.resolve([]);
        }

        if (!element) {
            this.jobSubmitOptionNameToItem = new Map();
            const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
                .get('eh.jobSubmitOptions.submitOptionNamesAndContents') as string[]; 
            submitOptionNamesAndContents.forEach((nameAndContent) => {
                const [name, content] = nameAndContent.split(':');
                this.jobSubmitOptionNameToItem.set(
                    name, new JobSubmitOptionItem(
                        name, content, name === this.currentSubmitOptionName
                    )
                );
            });
            return Promise.resolve(Array.from(this.jobSubmitOptionNameToItem.values()));
        }
    }

    getCurrentSubmitOption() {
        return this.currentSubmitOptionName ? 
            this.jobSubmitOptionNameToItem.get(this.currentSubmitOptionName) : undefined;
    }

    setCurrentSubmitOption(submitOptionItem: JobSubmitOptionItem) {
        this.currentSubmitOptionName = submitOptionItem.name;
        this.refresh();
    }
}


export class JobSubmitOptionItem extends vscode.TreeItem {
    constructor(
        public readonly name: string, 
        public readonly content: string,
        isCurrent: boolean
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.label = isCurrent ? '(current) ' + name : name;
        this.description = content;
        this.tooltip = content;
        this.contextValue = 'jobSubmitOptionItem';
    }
}