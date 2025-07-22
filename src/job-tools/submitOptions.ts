import * as vscode from 'vscode';


export const setCurrentSubmitOptionCallback = (
    submitOptionProvider: SubmitOptionProvider,
    submitOptionItem?: SubmitOptionItem
) => {
    if (!submitOptionItem) {
        return;
    }
    submitOptionProvider.setCurrentSubmitOption(submitOptionItem);
}

export const addSubmitOptionCallback = async () => {
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
                .get('experiment-helper.submitOptions.submitOptionNamesAndContents') as string[];
            const currentNames = submitOptionNamesAndContents
                .map(submitOptionString => submitOptionString.split(':')[0]);
            return currentNames.includes(name) ? `Name ${name} already exists.` : '';
        }
    });
    if (!newSubmitOptionString) {
        return;
    }
    const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
        .get('experiment-helper.submitOptions.submitOptionNamesAndContents') as string[];
    submitOptionNamesAndContents.push(newSubmitOptionString);
    // note that the update method returns Thenable
    // await until the update finished
    await vscode.workspace.getConfiguration().update(
        'experiment-helper.submitOptions.submitOptionNamesAndContents',
        submitOptionNamesAndContents
    );
}

export const deleteSubmitOptionCallback = async (
    submitOptionProvider: SubmitOptionProvider,
    submitOptionItem?: SubmitOptionItem
) => {
    if (!submitOptionItem) {
        return;
    }
    const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
        .get('experiment-helper.submitOptions.submitOptionNamesAndContents') as string[];
    await vscode.workspace.getConfiguration().update(
        'experiment-helper.submitOptions.submitOptionNamesAndContents',
        submitOptionNamesAndContents
            .filter(item => item.split(':')[0] !== submitOptionItem.name)
    );
    if (submitOptionItem.name === submitOptionProvider.getCurrentSubmitOption()?.name) {
        submitOptionProvider.setCurrentSubmitOption(undefined);
    }
    submitOptionProvider.refresh();
}

export class SubmitOptionProvider 
    implements vscode.TreeDataProvider<SubmitOptionItem> {
    
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | SubmitOptionItem | SubmitOptionItem[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    private currentSubmitOptionName: string | undefined = undefined;
    private submitOptionNameToItem: Map<string, SubmitOptionItem> = new Map();
    
    constructor(public readonly workspaceRoot: string | undefined) {}
    
    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: SubmitOptionItem): 
        vscode.TreeItem | Thenable<vscode.TreeItem> {
        
        return element;
    }

    getChildren(element?: SubmitOptionItem | undefined): 
        vscode.ProviderResult<SubmitOptionItem[]> {
        
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Open a workspace first.'
            );
            return Promise.resolve([]);
        }

        if (!element) {
            this.submitOptionNameToItem = new Map();
            const submitOptionNamesAndContents = vscode.workspace.getConfiguration()
                .get('experiment-helper.submitOptions.submitOptionNamesAndContents') as string[];
            submitOptionNamesAndContents.forEach((nameAndContent) => {
                const [name, content] = nameAndContent.split(':');
                this.submitOptionNameToItem.set(
                    name, new SubmitOptionItem(
                        name, content, name === this.currentSubmitOptionName
                    )
                );
            });
            return Promise.resolve(Array.from(this.submitOptionNameToItem.values()));
        }
    }

    getCurrentSubmitOption() {
        return this.currentSubmitOptionName ? 
            this.submitOptionNameToItem.get(this.currentSubmitOptionName) : undefined;
    }

    setCurrentSubmitOption(submitOptionItem: SubmitOptionItem | undefined) {
        this.currentSubmitOptionName = 
            submitOptionItem ? submitOptionItem.name : undefined;
        this.refresh();
    }
}


export class SubmitOptionItem extends vscode.TreeItem {
    constructor(
        public readonly name: string, 
        public readonly content: string,
        isCurrent: boolean
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.label = name;
        this.description = content;
        this.tooltip = content;
        this.contextValue = 'submitOptionItem';
        this.iconPath = isCurrent ?
            new vscode.ThemeIcon('circle-filled') :
            new vscode.ThemeIcon('circle-outline');
        // no need to register this command in package.json
        this.command = {
            command: 'experiment-helper.submitOptions.setCurrentSubmitOption',
            title: 'Set Current Submit Option',
            arguments: [this]
        }
    }
}