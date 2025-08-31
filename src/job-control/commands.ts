import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { JobFolderItem, JobItem, JobStatusDetailsScheme } from './providers';


interface CommandStatus {
    isSuccessful: boolean;
    message: string;
}


export function submitSingleJob(
    workspaceRoot: string | undefined,
    jobConfig: string | undefined,
    item: JobItem
) {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }
    if (!jobConfig) {
        vscode.window.showInformationMessage(
            'Select a job config first.'
        );
        return;
    }

    const commandStatus = submitJob(
        workspaceRoot,
        jobConfig,
        item
    );

    if (commandStatus.isSuccessful) {
        vscode.window.showInformationMessage(`Job ${item.label} is submitted.`);
    } else {
        vscode.window.showInformationMessage(commandStatus.message);
    }
}

export function submitMultipleJobs(
    workspaceRoot: string | undefined,
    jobConfig: string | undefined,
    itemSelection: readonly (JobFolderItem | JobItem)[]
) {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }
    if (!jobConfig) {
        vscode.window.showInformationMessage(
            'Select a job config first.'
        );
        return;
    }

    let successNumber = 0;
    let failNumber = 0;
    let failMessageList: string[] = [];

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            const commandStatus = submitJob(
                workspaceRoot,
                jobConfig,
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

export async function deleteSingleJob(
    workspaceRoot: string | undefined,
    item: JobItem
) {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }

    const waitSeconds = vscode.workspace.getConfiguration()
        .get('experimentHelper.jobControl.waitDeleteConfirmationSeconds') as number;

    const isCanceled = await waitDeleteConfirmation(waitSeconds);
    if (isCanceled) {
        vscode.window.showInformationMessage('Canceled.');
        return;
    }

    const commandStatus = deleteJob(workspaceRoot, item);
    if (commandStatus.isSuccessful) {
        vscode.window.showInformationMessage(`Job ${item.label} is deleted.`);
    } else {
        vscode.window.showInformationMessage(commandStatus.message);
    }
}

export async function deleteMultipleJobs(
    workspaceRoot: string | undefined,
    itemSelection: readonly (JobFolderItem | JobItem)[]
) {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
        return;
    }

    const waitSeconds = vscode.workspace.getConfiguration()
        .get('experimentHelper.jobControl.waitDeleteConfirmationSeconds') as number;

    const isCanceled = await waitDeleteConfirmation(waitSeconds);
    if (isCanceled) {
        vscode.window.showInformationMessage('Canceled.');
        return;
    }

    let successNumber = 0;
    let failNumber = 0;
    let failMessageList: string[] = [];

    itemSelection.forEach((item) => {
        if (item instanceof JobItem) {
            const commandStatus = deleteJob(workspaceRoot, item);
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

export async function showJobOutputOrError(
    workspaceRoot: string | undefined,
    logSuffix: string,
    item: JobItem
) {
    if (!workspaceRoot) {
        vscode.window.showInformationMessage(
            'Open a workspace first.'
        );
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

export async function showJobScript(itemItemPath: string, itemLabel: string) {
    try {
        fs.accessSync(itemItemPath);
    } catch (err) {
        vscode.window.showInformationMessage(
            `File ${itemLabel} does not exist.`
        );
        return;
    }

    const textDocument = await vscode.workspace.openTextDocument(itemItemPath);
    await vscode.window.showTextDocument(textDocument);
}

export async function copyJupyterUrlToClipboard(item: JobItem) {
    const jupyterUrl = item.jupyterUrl;
    if (!jupyterUrl) {
        vscode.window.showInformationMessage('Could not find Jupyter URL.');
        return;
    }

    await vscode.env.clipboard.writeText(jupyterUrl);
    vscode.window.showInformationMessage('Jupyter URL is copied to the clipboard.');
}

export async function showJobStatusDetails(item: JobItem) {
    if (!item.jobStatus) {
        vscode.window.showInformationMessage(`Job ${item.label} is not queued.`);
        return;
    }
    const uri = vscode.Uri.parse(JobStatusDetailsScheme + ':' + item.jobStatus.id);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
}

function submitJob(
    workspaceRoot: string,
    jobConfig: string,
    jobItem: JobItem
): CommandStatus {
    if (jobItem.jobStatus) {
        return {
            isSuccessful: false,
            message: `Job ${jobItem.label} is in progress.`
        };
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

    const scriptOutBackupPath = scriptBasePath + `_backup_at_${currentTimeString}_o.txt`;
    const scriptErrorBackupPath = scriptBasePath + `_backup_at_${currentTimeString}_e.txt`;

    try {
        fs.accessSync(scriptOutPath);
        fs.renameSync(scriptOutPath, scriptOutBackupPath);
    } catch (err) { }

    try {
        fs.accessSync(scriptErrorPath);
        fs.renameSync(scriptErrorPath, scriptErrorBackupPath);
    } catch (err) { }

    const commandReturns = child_process.spawnSync('qsub', [
        jobConfig,
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

function deleteJob(workspaceRoot: string, jobItem: JobItem): CommandStatus {
    if (!jobItem.jobStatus) {
        return {
            isSuccessful: false,
            message: `Job ${jobItem.label} is not queued.`
        };
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

function waitDeleteConfirmation(seconds: number) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Delete Job',
        cancellable: true
    }, async (progress, token) => {
        const incrementPerStep = 100 / seconds;
        for (let i = seconds; i > 0; --i) {
            if (token.isCancellationRequested) {
                break;
            }
            progress.report({ increment: incrementPerStep, message: `Start in ${i}s.` });
            await new Promise<void>(resolve => setTimeout(resolve, 1000));
        }
        return Promise.resolve(token.isCancellationRequested);
    });
}
