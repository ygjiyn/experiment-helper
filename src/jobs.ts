import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';


interface JobStatus {
    id: string,
    state: string
}

export const submitCallback = (
    workspaceRoot: string | undefined,
    submitOption: string | undefined,
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }
    if (!submitOption) {
        vscode.window.showInformationMessage(
            'Select a submit option first.'
        );
        return;
    }
    if (!item || item instanceof JobFolderItem) {
        return;
    }
    
    submitOneJob(
        workspaceRoot, 
        submitOption,
        item
    );
}

export const submitMultipleCallback = (
    workspaceRoot: string | undefined,  
    submitOption: string | undefined,
    itemSelection: readonly (JobFolderItem | JobItem)[]
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }
    if (!submitOption) {
        vscode.window.showInformationMessage(
            'Select a submit option first.'
        );
        return;
    }

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            submitOneJob(
                workspaceRoot, 
                submitOption,
                item
            );
        }
    });
}

export const deleteCallback = (
    workspaceRoot: string | undefined,  
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!item || item instanceof JobFolderItem) {
        return;
    }

    deleteOneJob(workspaceRoot, item);
}

export const deleteMultipleCallback = (
    workspaceRoot: string | undefined, 
    itemSelection: readonly (JobFolderItem | JobItem)[]
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            deleteOneJob(workspaceRoot, item);
        }
    });
}

export const showJobOutputOrErrorCallback = async (
    workspaceRoot: string | undefined, 
    logSuffix: string,
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!item || item instanceof JobFolderItem) {
        return;
    }
    
    const scriptBasePath = item.itemPath.slice(0, -'.sh'.length);
    const scriptLogPath = scriptBasePath + logSuffix;

    try {
        fs.accessSync(scriptLogPath);
    } catch (err) {
        vscode.window.showInformationMessage(
            `Log file ${scriptLogPath} does not exist.`
        );
        return;
    }
    
    const textDocument = await vscode.workspace.openTextDocument(scriptLogPath);
    await vscode.window.showTextDocument(textDocument);
}

export const showJobScriptCallback = async (
    workspaceRoot: string | undefined, 
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!item || item instanceof JobFolderItem) {
        return;
    }

    try {
        fs.accessSync(item.itemPath);
    } catch (err) {
        vscode.window.showInformationMessage(
            `File ${item.itemPath} does not exist.`
        );
        return;
    }

    const textDocument = await vscode.workspace.openTextDocument(item.itemPath);
    await vscode.window.showTextDocument(textDocument);
}

export const createJobScriptFromCurrentJobScriptCallback = async (
    workspaceRoot: string | undefined, 
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage(
            'Open an editor first.'
        );
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const currentJobScriptPath = document.fileName;
    const currentJobScriptPathBase = currentJobScriptPath.slice(0, -'.sh'.length);

    const startOffset = document.offsetAt(selection.start);
    const endOffset = document.offsetAt(selection.end);

    const valuesToUseString = await vscode.window.showInputBox({
        title: 'Type values used for replacement',
        placeHolder: 'value1[]value2[]value3[]...',
        prompt: 'Values are separated by "[]"'
    });
    if (!valuesToUseString) {
        return;
    }
    const valuesToUse = valuesToUseString.split('[]');

    const newJobScriptsSuffix = await vscode.window.showInputBox({
        title: 'Type the suffix used in the names of new scripts',
        prompt: (
            'Example: current script "job.sh", suffix "suffix", ' +
            'then the name of each new script is "job_suffix_[values].sh"'
        )
    });
    if (!newJobScriptsSuffix) {
        return;
    }

    valuesToUse.forEach((value) => {
        const newJobScriptPath = 
            `${currentJobScriptPathBase}_${newJobScriptsSuffix}_${value}.sh`;
        fs.copyFileSync(currentJobScriptPath, newJobScriptPath);
        const newScript = fs.readFileSync(newJobScriptPath, 'utf8');
        const modifiedNewScript = newScript.slice(0, startOffset) + 
            value + newScript.slice(endOffset);
        fs.writeFileSync(newJobScriptPath, modifiedNewScript);
        vscode.window.showInformationMessage(`Created: ${newJobScriptPath}`);
    });
}

function submitOneJob(
    workspaceRoot: string,
    submitOption: string,
    jobItem: JobItem
) {
    if (jobItem.jobStatus) {
        vscode.window.showInformationMessage(`Job ${jobItem.label} is in progress.`);
        return;
    }
    const scriptBasePath = jobItem.itemPath.slice(0, -'.sh'.length);
    const scriptOutPath = scriptBasePath + '_o.txt';
    const scriptErrorPath = scriptBasePath + '_e.txt';

    const outputLines = child_process.spawnSync('qsub', [
        submitOption, 
        `-o ${scriptOutPath}`,
        `-e ${scriptErrorPath}`,
        jobItem.itemPath
    ], {
        cwd: workspaceRoot,
        shell: '/bin/bash',
    }).stdout.toString().trim().split('\n');
    const jobId = outputLines.at(-1)?.split(' ')[2];
    if (!jobId) {
        vscode.window.showWarningMessage('Could not obtain job id.');
    }
    vscode.window.showInformationMessage(
        `Job ${jobItem.label} is submitted with id ${jobId}.`
    );
}

function deleteOneJob(workspaceRoot: string, jobItem: JobItem) {
    if (!jobItem.jobStatus) {
        vscode.window.showWarningMessage(`Job ${jobItem.label} is not queued.`);
    } else {
        const qdelReturn = child_process.spawnSync('qdel', [jobItem.jobStatus.id], {
            cwd: workspaceRoot,
            shell: '/bin/bash',
        });
        vscode.window.showInformationMessage(
            qdelReturn.stdout.toString().trim() + qdelReturn.stderr.toString().trim()
        );
    }
}

export class JobProvider implements vscode.TreeDataProvider<JobFolderItem | JobItem> {
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | JobFolderItem | JobItem | (JobFolderItem | JobItem)[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    constructor(public readonly workspaceRoot: string | undefined) {}

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: JobFolderItem | JobItem) {
        return element;
    }

    getChildren(element?: JobFolderItem | JobItem | undefined) {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Current workspace is empty.'
            );
            return Promise.resolve([]);
        }

        const scriptFolderRelativePath = vscode.workspace.getConfiguration()
            .get('eh.jobs.scriptFolderRelativePath') as string;
        const scriptFolderPath = path.join(
            this.workspaceRoot, scriptFolderRelativePath
        );
        const jobNameToStatus = this.getCurrentJobNameToStatus();

        const returnList: (JobFolderItem | JobItem)[] = [];
        if (!element) {
            this.readAndHanderCurrentPath(scriptFolderPath, jobNameToStatus, returnList);
        } else if (element instanceof JobFolderItem) {
            this.readAndHanderCurrentPath(element.itemPath, jobNameToStatus, returnList);
        }
        return Promise.resolve(returnList);
    }

    private readAndHanderCurrentPath(
        currentPath: string, 
        jobNameToStatus: Map<string, JobStatus>,
        returnList: (JobFolderItem | JobItem)[]
    ) {
        fs.readdirSync(currentPath, { withFileTypes: true }).forEach((dirent) => {
            const thisItemPath = path.join(currentPath, dirent.name);
            if (dirent.isDirectory()) {
                returnList.push(new JobFolderItem(dirent.name, thisItemPath));
            } else if (dirent.name.endsWith('.sh')) {
                // TODO 
                // currently we only handle jobs submitted using this extension
                // i.e., those whose job names are the absolute paths of scripts
                const thisJobStatus = jobNameToStatus.get(thisItemPath);
                returnList.push(new JobItem(dirent.name, thisJobStatus, thisItemPath));
            }
        });
    }

    private getCurrentJobNameToStatus(): Map<string, JobStatus> {
        const qstatOutput = child_process.spawnSync('qstat', {
            cwd: this.workspaceRoot,
            shell: '/bin/bash',
        }).stdout.toString().trim();
        if (!qstatOutput) {
            return new Map();
        }
        const jobNameToStatus: Map<string, JobStatus> = new Map();
        const qstatOutputLines = qstatOutput.split('\n');
        // skip the first two lines (headers)
        qstatOutputLines.slice(2).forEach((line) => {
            const lineContents = line.trim().split(/\s+/);
            const thisJobId = lineContents[0];
            const thisJobState = lineContents[4];
            const thisJobQstatDetail = child_process.spawnSync(
                'qstat', ['-j', thisJobId], {
                    cwd: this.workspaceRoot,
                    shell: '/bin/bash',
                }
            ).stdout.toString().trim();
            // only one line starts with 'script_file:'
            const thisJobScriptFile = thisJobQstatDetail
                .split('\n').filter(line => line.startsWith('script_file:'))[0]
                .trim().split(/\s+/)[1];
            jobNameToStatus.set(thisJobScriptFile, {
                id: thisJobId,
                state: thisJobState
            });
        });
        return jobNameToStatus;
    }
}

export class JobFolderItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        // path starting with workspaceRoot
        public readonly itemPath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class JobItem extends vscode.TreeItem {
    constructor(
        public readonly label: string, 
        public readonly jobStatus: JobStatus | undefined,
        // path starting with workspaceRoot
        public readonly itemPath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'jobItem';
        this.description = jobStatus ? 
            `id: ${jobStatus.id}, state: ${jobStatus.state}` : ''
        this.iconPath = (jobStatus && jobStatus.state === 'r') ?
            new vscode.ThemeIcon('circle-filled') :
            new vscode.ThemeIcon('circle-outline');
        this.command = {
            command: 'eh.jobs.showJobScript',
            title: 'Show Job Script',
            arguments: [this]
        }
    }
}
