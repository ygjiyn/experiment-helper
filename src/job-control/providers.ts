import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';


interface JobStatus {
    id: string;
    state: string;
}

export class JobControlProvider 
    implements vscode.TreeDataProvider<JobFolderItem | JobItem> {
    
    private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter
        <void | JobFolderItem | JobItem | (JobFolderItem | JobItem)[] | null | undefined>();
    onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;

    constructor(public readonly workspaceRoot?: string) { }

    refresh() {
        this.onDidChangeTreeDataEventEmitter.fire();
    }

    getTreeItem(element: JobFolderItem | JobItem) {
        return element;
    }

    async getChildren(element?: JobFolderItem | JobItem) {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage(
                'Open a workspace first.'
            );
            return Promise.resolve([]);
        }

        const scriptFolderRelativePath = vscode.workspace.getConfiguration()
            .get('experimentHelper.jobControl.scriptsFolderRelativePath') as string;
        const scriptFolderPath = path.join(
            this.workspaceRoot, scriptFolderRelativePath
        );
        const resultFolderRelativePath = vscode.workspace.getConfiguration()
            .get('experimentHelper.jobControl.resultsFolderRelativePath') as string;
        const resultFolderPath = path.join(
            this.workspaceRoot, resultFolderRelativePath
        );

        const jobNameToStatus = this.getCurrentJobNameToStatus();

        const returnList: (JobFolderItem | JobItem)[] = [];
        if (!element) {
            await this.readAndHandleCurrentPath(
                scriptFolderPath,
                jobNameToStatus,
                returnList,
                resultFolderPath
            );
        } else if (element instanceof JobFolderItem) {
            await this.readAndHandleCurrentPath(
                element.itemPath,
                jobNameToStatus,
                returnList,
                element.itemResultPath
            );
        }
        return Promise.resolve(returnList);
    }

    private async readAndHandleCurrentPath(
        currentPath: string,
        jobNameToStatus: Map<string, JobStatus>,
        returnList: (JobFolderItem | JobItem)[],
        // passed to the script when submitting
        currentResultPath: string
    ) {
        const startJupyterScriptPrefix = vscode.workspace.getConfiguration()
            .get('experimentHelper.jobControl.startJupyterScriptPrefix') as string;
        try {
            const direntList = fs.readdirSync(currentPath, { withFileTypes: true });
            for (let i = 0; i < direntList.length; ++i) {
                const dirent = direntList[i];

                const thisItemPath = path.join(currentPath, dirent.name);
                if (dirent.isDirectory()) {
                    returnList.push(new JobFolderItem(
                        dirent.name,
                        thisItemPath,
                        path.join(currentResultPath, dirent.name)
                    ));
                } else if (dirent.name.endsWith('.sh')) {
                    // TODO not urgent
                    // currently we only handle jobs submitted using this extension
                    // i.e., those whose job names are the absolute paths of scripts
                    const thisJobStatus = jobNameToStatus.get(thisItemPath);

                    const thisScriptBasePath = thisItemPath.slice(0, -'.sh'.length);
                    const thisScriptOutputLogPath = thisScriptBasePath + '_o.txt';
                    const thisScriptErrorLogPath = thisScriptBasePath + '_e.txt';

                    let thisHasOutputLog = true;
                    let thisHasErrorLog = true;

                    try {
                        fs.accessSync(thisScriptOutputLogPath);
                    } catch (err) {
                        thisHasOutputLog = false;
                    }

                    try {
                        fs.accessSync(thisScriptErrorLogPath);
                    } catch (err) {
                        thisHasErrorLog = false;
                    }

                    const thisIsStartJupyterScript = dirent.name
                        .startsWith(startJupyterScriptPrefix);

                    let thisJupyterUrl: string | undefined = undefined;
                    if (thisIsStartJupyterScript) {
                        thisJupyterUrl = await this.getJupyterUrlFromLog(thisScriptErrorLogPath);
                    }

                    returnList.push(new JobItem(
                        dirent.name,
                        thisJobStatus,
                        thisItemPath,
                        // remove '.sh', make it a folder in the results folder
                        // NOTE
                        // the user should make sure the script name (without '.sh')
                        // should not be the same with any existing folder
                        // this extension does not validate anything related to "results"
                        // users should handle the "results" folder by themselves
                        // e.g., creating sub-folders in the "results" folder,
                        // whether overwrite or keep files in an existing folder, etc.
                        // the currentResultPath is provided just for the convenience,
                        // and users no longer need to write the result path 
                        // of the similar pattern in each script manually
                        path.join(currentResultPath, dirent.name.slice(0, -'.sh'.length)),
                        thisHasOutputLog,
                        thisHasErrorLog,
                        thisIsStartJupyterScript,
                        thisJupyterUrl
                    ));
                }
            };
        } catch (err) {
            // the case that the script folder does no exist
            // do nothing, returnList is unchanged and thus []
        }
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

    private async getJupyterUrlFromLog(logPath: string) {
        try {
            const file = await fs.promises.open(logPath);
            for await (const line of file.readLines()) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('http://') &&
                    !trimmedLine.startsWith('http://127.0.0.1')) {
                    return trimmedLine;
                }
            }
            return undefined;
        } catch (err) {
            return undefined;
        }
    }
}

export class JobFolderItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        // path starting with workspaceRoot
        public readonly itemPath: string,
        public readonly itemResultPath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class JobItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly jobStatus: JobStatus | undefined,
        // path starting with workspaceRoot
        public readonly itemPath: string,
        public readonly itemResultPath: string,
        hasOutputLog: boolean,
        hasErrorLog: boolean,
        isStartJupyterScript: boolean,
        public readonly jupyterUrl: string | undefined
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'jobItem' +
            `-hasOutputLog_${hasOutputLog}` +
            `-hasErrorLog_${hasErrorLog}` +
            `-isStartJupyterScript_${isStartJupyterScript}` +
            `-hasJupyterUrl_${Boolean(jupyterUrl)}` +
            `-isSubmitted_${Boolean(jobStatus)}`;
        if (jobStatus) {
            switch (jobStatus.state) {
                case 'r':
                    if (jupyterUrl) {
                        // only isStartJupyterScript could have jupyterUrl
                        this.iconPath = new vscode.ThemeIcon('notebook-kernel-select');
                    } else {
                        this.iconPath = new vscode.ThemeIcon('circle-filled');
                    }
                    break;
                case 'qw':
                    this.iconPath = new vscode.ThemeIcon('clock');
                    break;
                default:
                    this.iconPath = new vscode.ThemeIcon('question');
                    this.description = `Job State: ${jobStatus.state}`;
            }
        } else {
            if (isStartJupyterScript) {
                this.iconPath = new vscode.ThemeIcon('notebook');
            } else {
                this.iconPath = new vscode.ThemeIcon('circle-outline');
            }
        }
        this.command = {
            command: 'experimentHelper.jobControl.showJobScript',
            title: 'Show Job Script',
            arguments: [this]
        };
    }
}


export const JobStatusDetailsScheme = 'jobStatusDetails';

export class JobStatusDetailsProvider implements vscode.TextDocumentContentProvider {
    constructor(public readonly workspaceRoot: string | undefined) {}

    provideTextDocumentContent(uri: vscode.Uri) {
        const thisJobId = uri.path;
        if (!this.workspaceRoot) {
            return 'Open a workspace first.';
        }
        const thisJobQstatReturn = child_process.spawnSync(
            'qstat', ['-j', thisJobId], {
            cwd: this.workspaceRoot,
            shell: '/bin/bash',
        }
        );
        const isSuccessful = thisJobQstatReturn.status === 0;
        const jobDetailStdout = thisJobQstatReturn.stdout.toString().trim();
        const jobDetailStderr = thisJobQstatReturn.stderr.toString().trim();

        if (!isSuccessful) {
            return [
                'Error(s) occurred.',
                'Stdout:',
                jobDetailStdout,
                'Stderr:',
                jobDetailStderr
            ].join('\n');
        }

        let jobNumber = 'Not Available';
        let submissionTime = 'Not Available';
        let cwd = 'Not Available';
        let hardResourceList = 'Not Available';
        let scriptFile = 'Not Available';
        let parallelEnvironment = 'Not Available';
        let submitCmd = 'Not Available';
        let startTime: string[] = [];
        let execHostList: string[] = [];
        let usage: string[] = [];

        jobDetailStdout.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            const lineZero = trimmedLine.split(/\s+/)[0].trim();
            const lineFromOne = trimmedLine.split(/\s+/).slice(1).join(' ').trim();
            const lineFromTwo = trimmedLine.split(/\s+/).slice(2).join(' ').trim();
            switch (lineZero) {
                case 'job_number:':
                    jobNumber = lineFromOne;
                    break;
                case 'submission_time:':
                    submissionTime = lineFromOne;
                    break;
                case 'cwd:':
                    cwd = lineFromOne;
                    break;
                case 'hard_resource_list:':
                    hardResourceList = lineFromOne;
                    break;
                case 'script_file:':
                    scriptFile = lineFromOne;
                    break;
                case 'parallel':
                    parallelEnvironment = lineFromTwo;
                    break;
                case 'submit_cmd:':
                    submitCmd = lineFromOne;
                    break;
                case 'start_time':
                    startTime.push(lineFromTwo);
                    break;
                case 'exec_host_list':
                    execHostList.push(lineFromTwo);
                    break;
                case 'usage':
                    usage.push(lineFromTwo);
                    break;
            }
        });

        return [
            '--------------------------------------------------',
            'Job Status Details',
            '--------------------------------------------------',
            `Job Number: ${jobNumber}`,
            `Script File: ${scriptFile}`,
            `Submit CMD: ${submitCmd}`,
            '--------------------------------------------------',
            `Submission Time: ${submissionTime}`,
            `Start Time: ${startTime.length > 0 ?
                startTime.join(' / ') : 'Not Available'}`,
            '--------------------------------------------------',
            `CWD: ${cwd}`,
            `Hard Resource List: ${hardResourceList}`,
            `Parallel Environment: ${parallelEnvironment}`,
            `Exec Host List: ${execHostList.length > 0 ?
                execHostList.join(' / ') : 'Not Available'}`,
            `Usage: ${usage.length > 0 ?
                usage.join(' / ') : 'Not Available'}`,
            '--------------------------------------------------'
        ].join('\n');
    }
}
