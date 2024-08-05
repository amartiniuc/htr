import * as vscode from 'vscode';
import EnvironmentsProvider from "../providers/EnvironmentsProvider";
import FilesProvider from "../providers/FilesProvider";
import ValuesProvider from "../providers/ValuesProvider";
import General from '../config/General';
import ConfigObject from '../entity/ConfigObject';
import * as path from 'path';

interface Environment {
    values: Record<string, string | object>;
    files: string[];
}

export default class ProviderService {

    private disallowedFiles = [
        'values.yaml',
        'chart.yaml'
    ];

    private environmentsProvider:EnvironmentsProvider;
    private filesProvider:FilesProvider;
    private valuesProvider:ValuesProvider;

    constructor() {
        this.environmentsProvider = new EnvironmentsProvider();
        this.filesProvider        = new FilesProvider();
        this.valuesProvider       = new ValuesProvider();

        vscode.window.registerTreeDataProvider(
            this.environmentsProvider.viewId, 
            this.environmentsProvider
        );

        vscode.window.registerTreeDataProvider(
            this.filesProvider.viewId, 
            this.filesProvider
        );

        vscode.window.registerTreeDataProvider(
            this.valuesProvider.viewId, 
            this.valuesProvider
        );
    }

    public getEnvironmentsProvider():EnvironmentsProvider {
        return this.environmentsProvider;
    }

    public getFilesProvider():FilesProvider {
        return this.filesProvider;
    }

    public getValuesProvider():ValuesProvider {
        return this.valuesProvider;
    }

    public async addEnvironment() {
        const name = await vscode.window.showInputBox({ prompt: 'Enter environment name' });
        if (!name) {
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};

        if (environments[name] !== undefined) {
            vscode.window.showErrorMessage(`Environment ${name} exists`);
            return;
        }

        var configObject = new ConfigObject(name);
        const newEnvironments = {...environments, [name]: configObject.getWritableObject()};

        await config.update('htr.environments', newEnvironments, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Environment ${name} created`);

        this.environmentsProvider._onDidChangeTreeData.fire(undefined);
    }

    public async addFile() {
        const items = await vscode.workspace.findFiles(`**/*.yaml`);

        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};

        const alreadyIncluded = environments[General.selectedEnvironment].files;

        const fileNames = items
            .map(item => item.fsPath)
            .map(p => {
                const bits = p.split(path.sep);
                return bits[bits.length - 1];
            })
            .filter(n => !this.disallowedFiles.includes(n.toLowerCase()))
            .filter(n => !alreadyIncluded.includes(n.toLowerCase()));
        
        if (fileNames.length === 0) {
            vscode.window.showErrorMessage(`No more value files available for inclusion!`);
            return;
        }

        const fileName = await vscode.window.showQuickPick(fileNames, {
            canPickMany: false
        }) || '';

        const newEnvironments = {
            ...environments,
            [General.selectedEnvironment]: {
                ...environments[General.selectedEnvironment],
                files: [...environments[General.selectedEnvironment].files, fileName]
            }
        };
        await config.update('htr.environments', newEnvironments, vscode.ConfigurationTarget.Workspace);
        this.environmentsProvider._onDidChangeTreeData.fire(undefined);
    }

    public async addValue() {
        const key = await vscode.window.showInputBox({ prompt: 'Enter key' });
        if (!key) {
            vscode.window.showErrorMessage('Key is required');
            return;
        }

        const value = await vscode.window.showInputBox({ prompt: 'Enter value' });
        if (!value) {
            vscode.window.showErrorMessage('Value is required');
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};

        const se = General.selectedEnvironment;
        if (environments[se].values.hasOwnProperty(key)) {
            vscode.window.showErrorMessage('Key already present. You might want to edit it.');
            return;
        }

        const newEnvironments = {
            ...environments,
            [se]: {
                ...environments[General.selectedEnvironment],
                values: {...environments[se].values, [key]: value}
            }
        };
        await config.update('htr.environments', newEnvironments, vscode.ConfigurationTarget.Workspace);
        this.environmentsProvider._onDidChangeTreeData.fire(undefined);
    }

    public async editValue(e:vscode.TreeItem) {
        const s:string = e.label?.toString() || '';
        const bits = s.split(":");
        const previousKey = bits[0].trim();
        const previousValue = bits[1].trim();

        const key = await vscode.window.showInputBox({ prompt: 'Enter key', value: previousKey });
        if (!key) {
            vscode.window.showErrorMessage('Key is required');
            return;
        }

        const value = await vscode.window.showInputBox({ prompt: 'Enter value', value: previousValue });
        if (!value) {
            vscode.window.showErrorMessage('Value is required');
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};

        const se = General.selectedEnvironment;

        type keys = string;
        var newValues: Record<keys, string | object> = {};
        for (const i in environments[se].values) {
            if (i !== previousKey) {
                newValues[i] = environments[se].values[i];
            }
        }
        newValues[key] = value;

        const newEnvironments = {
            ...environments,
            [se]: {
                ...environments[General.selectedEnvironment],
                values: newValues
            }
        };
        await config.update('htr.environments', newEnvironments, vscode.ConfigurationTarget.Workspace);
        this.environmentsProvider._onDidChangeTreeData.fire(undefined);
    }
}