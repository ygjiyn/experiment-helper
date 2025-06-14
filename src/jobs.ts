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
    jobProvider: JobProvider, 
    submitOption: string | undefined,
    item?: JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!submitOption) {
        vscode.window.showInformationMessage(
            'Select a submit option first.'
        );
        return;
    }
    if (!item) {
        return;
    }
    const scriptFolderRelativePath = vscode.workspace.getConfiguration()
        .get('eh.jobs.scriptFolderRelativePath') as string;

    submitOneJob(workspaceRoot, scriptFolderRelativePath, item.label, submitOption);

    jobProvider.refresh();
}

export const submitMultipleCallback = (
    workspaceRoot: string | undefined, 
    jobTreeView: vscode.TreeView<JobItem>, 
    jobProvider: JobProvider, 
    submitOption: string | undefined
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!submitOption) {
        vscode.window.showInformationMessage(
            'Select a submit option first.'
        );
        return;
    }

    const jobsSelection = jobTreeView.selection;
    const scriptFolderRelativePath = vscode.workspace.getConfiguration()
        .get('eh.jobs.scriptFolderRelativePath') as string;
    jobsSelection.forEach((jobItem) => {
        submitOneJob(workspaceRoot, scriptFolderRelativePath, jobItem.label, submitOption);
    });

    jobProvider.refresh();
}

export const refreshCallback = (provider: JobProvider) => {
    provider.refresh();
}

export const deleteCallback = (
    workspaceRoot: string | undefined, 
    jobProvider: JobProvider, 
    item?: JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }
    if (!item) {
        return;
    }

    deleteOneJob(workspaceRoot, item);

    jobProvider.refresh();
}

export const deleteMultipleCallback = (
    workspaceRoot: string | undefined, 
    jobTreeView: vscode.TreeView<JobItem>, 
    jobProvider: JobProvider, 
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Current workspace is empty. Open a workspace first.'
        );
        return;
    }

    const jobsSelection = jobTreeView.selection;
    jobsSelection.forEach((jobItem) => {
        deleteOneJob(workspaceRoot, jobItem);
    });

    jobProvider.refresh();
}



function submitOneJob(
    workspaceRoot: string, 
    scriptFolderRelativePath: string, 
    scriptName:string, 
    submitOption: string
) {
    const scriptFolderPath = path.join(workspaceRoot, scriptFolderRelativePath);
    const scriptPath = path.join(scriptFolderPath, scriptName);
    const scriptBaseName = scriptName.slice(0, -'.sh'.length) 
    const scriptOutPath = path.join(scriptFolderPath, scriptBaseName + '_o.txt')
    const scriptErrorPath = path.join(scriptFolderPath, scriptBaseName + '_e.txt')

    const outputLines = child_process.spawnSync('qsub', [
        submitOption, 
        `-o ${scriptOutPath}`,
        `-e ${scriptErrorPath}`,
        scriptPath
    ], {
        cwd: workspaceRoot,
        shell: '/bin/bash',
    }).stdout.toString().trim().split('\n');
    const jobId = outputLines.at(-1)?.split(' ')[2];
    if (!jobId) {
        vscode.window.showWarningMessage('Could not obtain job id.');
    }
    vscode.window.showInformationMessage(`Job ${scriptName} is submitted with id ${jobId}.`);
}

function deleteOneJob(workspaceRoot: string, item: JobItem) {
    if (!item.jobStatus) {
        vscode.window.showWarningMessage(`Job ${item.label} does not have a status.`);
    } else {
        const qdelReturn = child_process.spawnSync('qdel', [item.jobStatus.id], {
            cwd: workspaceRoot,
            shell: '/bin/bash',
        });
        vscode.window.showInformationMessage(
            qdelReturn.stdout.toString().trim() + qdelReturn.stderr.toString().trim()
        );
    }
}

export class JobProvider implements vscode.TreeDataProvider<JobItem> {
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | JobItem | JobItem[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    constructor(public readonly workspaceRoot: string | undefined) {}

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: JobItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: JobItem | undefined): vscode.ProviderResult<JobItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Current workspace is empty. Open a workspace first.'
            );
            return Promise.resolve([]);
        }
        if (!element) {
            const scriptFolderRelativePath = vscode.workspace.getConfiguration()
                .get('eh.jobs.scriptFolderRelativePath') as string;
            const scriptFolderPath = path.join(
                this.workspaceRoot, scriptFolderRelativePath
            );
            const jobFileNameList = fs.readdirSync(scriptFolderPath)
                .filter(fileName => fileName.endsWith('.sh'));
            const jobItemList: JobItem[] = [];

            const jobNameToStatus = this.getCurrentJobsStatus();
            
            jobFileNameList.forEach((fileName) => {
                const filePath = path.join(scriptFolderPath, fileName);
                const thisJobStatus = jobNameToStatus.get(filePath);
                jobItemList.push(new JobItem(fileName, thisJobStatus));
            })
            
            return Promise.resolve(jobItemList);
        }
    }

    getCurrentJobsStatus(): Map<string, JobStatus> {
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

export class JobItem extends vscode.TreeItem {
    constructor(
        public readonly label: string, 
        public readonly jobStatus: JobStatus | undefined
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'jobItem';
        this.description = jobStatus ? 
            `id: ${jobStatus.id}, state: ${jobStatus.state}` : ''
    }
}
