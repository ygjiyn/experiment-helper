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

export const addSubmitOptionCallback = async (
    jobSubmitOptionProvider: JobSubmitOptionProvider
) => {
    const newSubmitOptionString = await vscode.window.showInputBox({
        title: 'Add new submit option',
        value: (
            '[submit option name]:' + 
            '-S /bin/bash -cwd -l a100=1,s_vmem=100G -pe def_slot 10'
        ),
        prompt: (
            'The submit option name is a unique identifier ' +
            'of this option and should not replicate existing ones.'
        ),
        validateInput: (inputString) => {
            const name = inputString.split(':')[0];
            const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
                .get('eh.jobSubmitOptions.submitOptionNamesAndContents') as string[];
            const currentNames = submitOptionNamesAndContents
                .map(submitOptionString => submitOptionString.split(':')[0]);
            return currentNames.includes(name) ? `Name ${name} already exists.` : '';
        }
    });
    if (!newSubmitOptionString) {
        return;
    }
    const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
        .get('eh.jobSubmitOptions.submitOptionNamesAndContents') as string[];
    submitOptionNamesAndContents.push(newSubmitOptionString);
    // note that the update method returns Thenable
    // await until the update finished
    await vscode.workspace.getConfiguration().update(
        'eh.jobSubmitOptions.submitOptionNamesAndContents',
        submitOptionNamesAndContents
    );
    jobSubmitOptionProvider.refresh();
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