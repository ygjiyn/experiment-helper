import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';


interface JobStatus {
    id: string,
    state: string
}

interface CommandStatus {
    isSuccessful: boolean,
    message: string
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
    
    const commandStatus = submitOneJob(
        workspaceRoot, 
        submitOption,
        item
    );

    if (commandStatus.isSuccessful) {
        vscode.window.showInformationMessage(`Job ${item.label} is submitted.`);
    } else {
        vscode.window.showInformationMessage(commandStatus.message);
    }
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

    let successNumber = 0;
    let failNumber = 0;
    let failMessageList: string[] = [];

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            const commandStatus = submitOneJob(
                workspaceRoot, 
                submitOption,
                item
            );
            if (commandStatus.isSuccessful) {
                successNumber += 1;
            } else {
                failNumber += 1;
                failMessageList.push(item.label + ': ' + commandStatus.message);
            }
        }
    });

    if (failNumber === 0) {
        vscode.window.showInformationMessage(
            `Successfully submitted ${successNumber} jobs.`
        );
    } else {
        vscode.window.showInformationMessage(
            `Success: ${successNumber}, fail: ${failNumber}. ` + 
            `Details: ${failMessageList.join(' ')}`
        );
    }
}

export const deleteCallback = async (
    workspaceRoot: string | undefined,  
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }
    if (!item || item instanceof JobFolderItem) {
        return;
    }

    const isCanceled = await waitConfirmDeleteJob(5);
    if (isCanceled) {
        vscode.window.showInformationMessage('Canceled.')
        return;
    }

    const commandStatus = deleteOneJob(workspaceRoot, item);
    if (commandStatus.isSuccessful) {
        vscode.window.showInformationMessage(`Job ${item.label} is deleted.`);
    } else {
        vscode.window.showInformationMessage(commandStatus.message);
    }
}

export const deleteMultipleCallback = async (
    workspaceRoot: string | undefined, 
    itemSelection: readonly (JobFolderItem | JobItem)[]
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }

    const isCanceled = await waitConfirmDeleteJob(5);
    if (isCanceled) {
        vscode.window.showInformationMessage('Canceled.')
        return;
    }

    let successNumber = 0;
    let failNumber = 0;
    let failMessageList: string[] = [];

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            const commandStatus = deleteOneJob(workspaceRoot, item);
            if (commandStatus.isSuccessful) {
                successNumber += 1;
            } else {
                failNumber += 1;
                failMessageList.push(item.label + ': ' + commandStatus.message);
            }
        }
    });

    if (failNumber === 0) {
        vscode.window.showInformationMessage(
            `Successfully deleted ${successNumber} jobs.`
        );
    } else {
        vscode.window.showInformationMessage(
            `Success: ${successNumber}, fail: ${failNumber}. ` + 
            `Details: ${failMessageList.join(' ')}`
        );
    }
}

export const showJobOutputOrErrorCallback = async (
    workspaceRoot: string | undefined, 
    logSuffix: string,
    item?: JobFolderItem | JobItem
) => {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
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
            `Log file ${path.basename(scriptLogPath)} does not exist.`
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
            'Open a workspace first.'
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
            `File ${item.label} does not exist.`
        );
        return;
    }

    const textDocument = await vscode.workspace.openTextDocument(item.itemPath);
    await vscode.window.showTextDocument(textDocument);
}

export const closeAllScriptsAndLogsCallback = async () => {
    let scriptCount = 0;
    let outputCount = 0;
    let errorCount = 0;

    const tabsToClose: vscode.Tab[] = [];
    
    vscode.window.tabGroups.all.forEach(tabGroup => {
        tabGroup.tabs.forEach(tab => {
            if (tab.label.endsWith('.sh')) {
                tabsToClose.push(tab);
                scriptCount += 1;
            } else if (tab.label.endsWith('_o.txt')) {
                tabsToClose.push(tab);
                outputCount += 1;
            } else if (tab.label.endsWith('_e.txt')) {
                tabsToClose.push(tab);
                errorCount += 1;
            }
        })
    })

    await vscode.window.tabGroups.close(tabsToClose, true);
    
    vscode.window.showInformationMessage(
        `Closed tabs: ${scriptCount} script(s), ` +
        `${outputCount} output log(s), ${errorCount} error log(s).`
    );
}

export const createJobScriptFromCurrentJobScriptCallback = async (
    workspaceRoot: string | undefined
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

    let successNumber = 0;

    valuesToUse.forEach((value) => {
        const newJobScriptPath = 
            `${currentJobScriptPathBase}_${newJobScriptsSuffix}_${value}.sh`;
        fs.copyFileSync(currentJobScriptPath, newJobScriptPath);
        const newScript = fs.readFileSync(newJobScriptPath, 'utf8');
        const modifiedNewScript = newScript.slice(0, startOffset) + 
            value + newScript.slice(endOffset);
        fs.writeFileSync(newJobScriptPath, modifiedNewScript);
        successNumber += 1;
    });

    vscode.window.showInformationMessage(
        `Successfully created ${successNumber} scripts.`
    );
}

function submitOneJob(
    workspaceRoot: string,
    submitOption: string,
    jobItem: JobItem
): CommandStatus {
    if (jobItem.jobStatus) {
        return {
            isSuccessful: false,
            message: `Job ${jobItem.label} is in progress.`
        }
    }
    const scriptBasePath = jobItem.itemPath.slice(0, -'.sh'.length);
    const scriptOutPath = scriptBasePath + '_o.txt';
    const scriptErrorPath = scriptBasePath + '_e.txt';

    const currentTime = new Date();
    const currentTimeString = [
        currentTime.getFullYear(),
        currentTime.getMonth() + 1, // 0 - 11
        currentTime.getDate(), // 1 - 31
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
    ].join('_');

    const scriptOutBackupPath = 
        scriptBasePath + `_backup_at_${currentTimeString}_o.txt`;
    const scriptErrorBackupPath = 
        scriptBasePath + `_backup_at_${currentTimeString}_e.txt`;

    try {
        fs.accessSync(scriptOutPath);
        fs.renameSync(scriptOutPath, scriptOutBackupPath);
    } catch (err) {}

    try {
        fs.accessSync(scriptErrorPath);
        fs.renameSync(scriptErrorPath, scriptErrorBackupPath);
    } catch (err) {}

    const commandReturns = child_process.spawnSync('qsub', [
        submitOption, 
        `-o ${scriptOutPath}`,
        `-e ${scriptErrorPath}`,
        jobItem.itemPath,
        // if the script needs arguments
        // we may implement a "submit with arguments" callback
        // get the arguments from the user and put it here
        // user could pass pre-defined arguments (like submit options)
        // or type them in an input box
        // we do no plan to implement this currently
        jobItem.itemResultPath
    ], {
        cwd: workspaceRoot,
        shell: '/bin/bash',
    });
    // const jobId = commandReturns.stdout.toString().trim().split('\n')
    //     .at(-1)?.split(' ')[2];

    const isSuccessful = commandReturns.status === 0;

    return {
        isSuccessful: isSuccessful,
        message: isSuccessful ?
            commandReturns.stdout.toString() : commandReturns.stderr.toString()
    };
}

function deleteOneJob(workspaceRoot: string, jobItem: JobItem): CommandStatus {
    if (!jobItem.jobStatus) {
        return {
            isSuccessful: false,
            message: `Job ${jobItem.label} is not queued.`
        }
    }

    const commandReturns = child_process.spawnSync('qdel', [jobItem.jobStatus.id], {
        cwd: workspaceRoot,
        shell: '/bin/bash',
    });

    const isSuccessful = commandReturns.status === 0;

    return {
        isSuccessful: isSuccessful,
        message: isSuccessful ?
            commandReturns.stdout.toString() : commandReturns.stderr.toString()
    };
}

function waitConfirmDeleteJob(second: number): Thenable<boolean> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Delete Job',
        cancellable: true
    }, async (progress, token) => {
        const incrementPerStep = 100 / second;
        for (let i = second; i > 0; --i) {
            if (token.isCancellationRequested) {
                break;
            }
            progress.report({ increment: incrementPerStep, message: `Start in ${i}s.` });
            await new Promise<void>(resolve => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
        return Promise.resolve(token.isCancellationRequested);
    })
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
            .get('experiment-helper.jobs.scriptFolderRelativePath') as string;
        const scriptFolderPath = path.join(
            this.workspaceRoot, scriptFolderRelativePath
        );
        const resultFolderRelativePath = vscode.workspace.getConfiguration()
            .get('experiment-helper.jobs.resultFolderRelativePath') as string;
        const resultFolderPath = path.join(
            this.workspaceRoot, resultFolderRelativePath
        );

        const jobNameToStatus = this.getCurrentJobNameToStatus();

        const returnList: (JobFolderItem | JobItem)[] = [];
        if (!element) {
            this.readAndHanderCurrentPath(
                scriptFolderPath, 
                jobNameToStatus, 
                returnList,
                resultFolderPath
            );
        } else if (element instanceof JobFolderItem) {
            this.readAndHanderCurrentPath(
                element.itemPath, 
                jobNameToStatus, 
                returnList,
                element.itemResultPath
            );
        }
        return Promise.resolve(returnList);
    }

    private readAndHanderCurrentPath(
        currentPath: string, 
        jobNameToStatus: Map<string, JobStatus>,
        returnList: (JobFolderItem | JobItem)[],
        // passed to the script when submitting
        currentResultPath: string
    ) {
        fs.readdirSync(currentPath, { withFileTypes: true }).forEach((dirent) => {
            const thisItemPath = path.join(currentPath, dirent.name);
            if (dirent.isDirectory()) {
                returnList.push(new JobFolderItem(
                    dirent.name, 
                    thisItemPath,
                    path.join(currentResultPath, dirent.name)
                ));
            } else if (dirent.name.endsWith('.sh')) {
                // TODO 
                // currently we only handle jobs submitted using this extension
                // i.e., those whose job names are the absolute paths of scripts
                const thisJobStatus = jobNameToStatus.get(thisItemPath);
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
                    path.join(currentResultPath, dirent.name.slice(0, -'.sh'.length))
                ));
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
        public readonly itemResultPath: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'jobItem';
        if (jobStatus) {
            switch (jobStatus.state) {
                case 'r':
                    this.iconPath = new vscode.ThemeIcon('circle-filled');
                    break;
                case 'qw':
                    this.iconPath = new vscode.ThemeIcon('clock');
                    break;
                default:
                    this.iconPath = new vscode.ThemeIcon('question');
                    this.description = `Job State: ${jobStatus.state}`;
            }
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        this.command = {
            command: 'experiment-helper.jobs.showJobScript',
            title: 'Show Job Script',
            arguments: [this]
        }
    }
}


export const showJobStatusDetailsCallBack = async (item?: JobFolderItem | JobItem) => {
    if (!item || item instanceof JobFolderItem) {
        return;
    }
    if (!item.jobStatus) {
        vscode.window.showInformationMessage(`Job ${item.label} is not queued.`);
        return;
    }
    const uri = vscode.Uri.parse(JobStatusDetailsScheme + ':' + item.jobStatus.id);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
}

export const JobStatusDetailsScheme = 'jobStatusDetails';

export class JobStatusDetailsProvider implements vscode.TextDocumentContentProvider {
    constructor(public readonly workspaceRoot: string | undefined) {}
    provideTextDocumentContent(uri: vscode.Uri) {
        const thisJobId = uri.path;
        if (!this.workspaceRoot) {
            return 'Current workspace is empty.';
        }
        const thisJobQstatReturn = child_process.spawnSync(
            'qstat', ['-j', thisJobId], {
                cwd: this.workspaceRoot,
                shell: '/bin/bash',
            }
        )
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
            ].join('\n')
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
            `Start Time: ${
                startTime.length > 0 ? 
                startTime.join(' / ') : 'Not Available'
            }`,
            '--------------------------------------------------',
            `CWD: ${cwd}`,
            `Hard Resource List: ${hardResourceList}`,
            `Parallel Environment: ${parallelEnvironment}`,
            `Exec Host List: ${
                execHostList.length > 0 ? 
                execHostList.join(' / ') : 'Not Available'
            }`,
            `Usage: ${
                usage.length > 0 ? 
                usage.join(' / ') : 'Not Available'
            }`,
            '--------------------------------------------------'
        ].join('\n');
    }
}
