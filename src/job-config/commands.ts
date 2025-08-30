import * as vscode from 'vscode';
import { JobConfigProvider, JobConfigItem } from './providers';


export async function addJobConfig() {
    const newJobConfigString = await vscode.window.showInputBox({
        title: 'Add new job config',
        value: (
            '[job config name]:' +
            '-S /bin/bash -cwd -l a100=1,s_vmem=100G -pe def_slot 10'
        ),
        prompt: (
            'The job config name is a unique identifier ' +
            'of this option and should not replicate existing ones.'
        ),
        validateInput: (inputString) => {
            const name = inputString.split(':')[0];
            const jobConfigNamesAndContents = vscode.workspace.getConfiguration()
                .get('experimentHelper.jobConfig.jobConfigNamesAndContents') as string[];
            const currentNames = jobConfigNamesAndContents
                .map(jobConfigString => jobConfigString.split(':')[0]);
            return currentNames.includes(name) ? `Name ${name} already exists.` : '';
        }
    });
    if (!newJobConfigString) {
        return;
    }
    const jobConfigNamesAndContents = vscode.workspace.getConfiguration()
        .get('experimentHelper.jobConfig.jobConfigNamesAndContents') as string[];
    jobConfigNamesAndContents.push(newJobConfigString);
    // note that the update method returns Thenable
    // await until the update finished
    await vscode.workspace.getConfiguration().update(
        'experimentHelper.jobConfig.jobConfigNamesAndContents',
        jobConfigNamesAndContents
    );
}

export async function deleteJobConfig(
    jobConfigProvider: JobConfigProvider,
    jobConfigItem: JobConfigItem
) {
    const jobConfigNamesAndContents = vscode.workspace.getConfiguration()
        .get('experimentHelper.jobConfig.jobConfigNamesAndContents') as string[];
    await vscode.workspace.getConfiguration().update(
        'experimentHelper.jobConfig.jobConfigNamesAndContents',
        jobConfigNamesAndContents
            .filter(item => item.split(':')[0] !== jobConfigItem.name)
    );
    if (jobConfigItem.name === jobConfigProvider.getCurrentJobConfig()?.name) {
        jobConfigProvider.setCurrentJobConfig(undefined);
    }
    jobConfigProvider.refresh();
}
