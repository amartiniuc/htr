import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import EnvironmentsProvider from './providers/EnvironmentsProvider';
import ConfigObject from './entity/ConfigObject';
import FilesProvider from './providers/FilesProvider';
import ValuesProvider from './providers/ValuesProvider';
import General from './config/General';

export function activate(context: vscode.ExtensionContext) {

    // TODO check if helm is installed
    // TODO check if kubectl is present
    // TODO check if a helm chart is present (Chart.yaml file that contains name info)

    const environmentsProvider = new EnvironmentsProvider();
    vscode.window.registerTreeDataProvider(
        environmentsProvider.viewId, environmentsProvider
    );

    const environmentsTreeView = vscode.window.createTreeView(environmentsProvider.viewId, {
        treeDataProvider: environmentsProvider
    });

    const filesProvider = new FilesProvider();
    vscode.window.registerTreeDataProvider(
        filesProvider.viewId, filesProvider
    );

    const filesTreeView = vscode.window.createTreeView(filesProvider.viewId, {
        treeDataProvider: filesProvider
    });

    const valuesProvider = new ValuesProvider();
    vscode.window.registerTreeDataProvider(
        valuesProvider.viewId, valuesProvider
    );

    const valuesTreeView = vscode.window.createTreeView(valuesProvider.viewId, {
        treeDataProvider: valuesProvider
    });

    vscode.workspace.onDidChangeConfiguration(e => {
        console.log("onDidChangeConfiguration " + General.selectedEnvironment);
        environmentsProvider.refresh();
        valuesProvider.refresh();
        filesProvider.refresh();
    });

   context.subscriptions.push(
        environmentsTreeView,
        filesTreeView,
        valuesTreeView,
        vscode.commands.registerCommand('htr.addEnvironment', async () => {
            await addEnvironment();
        }),
        vscode.commands.registerCommand('htr.deleteEnvironment', async (e) => {
            await deleteEnvironment(e);
        }),
        vscode.commands.registerCommand('htr.deleteFile', async (e) => {
            // TODO implement deleteFile command
        }),
        vscode.commands.registerCommand('htr.deleteValue', async (e) => {
            // TODO implement deleteValue command
        }),
        vscode.commands.registerCommand('htr.previewYaml', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const filePath = document.fileName;
                const fileDir = path.dirname(filePath);
                const valuesFilePath = path.join(fileDir, 'values.yaml');

                fs.readFile(valuesFilePath, 'utf8', (err, data) => {
                    if (err) {
                        vscode.window.showErrorMessage(`Could not read values file: ${err.message}`);
                        return;
                    }

                    const values = yaml.load(data);
                    const template = yaml.load(document.getText());
                    const mergedYaml = mergeTemplateWithValues(template, values);

                    vscode.workspace.openTextDocument({ content: yaml.dump(mergedYaml), language: 'yaml' }).then(doc => {
                        vscode.window.showTextDocument(doc, { preview: false });
                    });
                });
            }
        }),
      );

      environmentsTreeView.onDidChangeSelection((event) => {
        const selectedItem = event.selection[0];
        if (selectedItem) {
            General.selectedEnvironment = selectedItem.label?.toString() || '';
            //vscode.window.showInformationMessage(`Item clicked: ${General.selectedEnvironment}`);
            console.log("changed selection " + General.selectedEnvironment);
            filesProvider.refresh();
            valuesProvider.refresh();
        }
    });      
}

export function deactivate() {}

async function deleteEnvironment(e:vscode.TreeItem) {
    const config = vscode.workspace.getConfiguration();
    var environments = config.get<Record<string, Object>>('htr.environments') || {};
    type keys = string;
    var newEnvironments : Record<keys, string | object> = {};
    for (var environment in environments) {
        if (environment !== e.label) {
            newEnvironments[environment] = environments[environment];
        }
    }
    config.update('htr.environments', newEnvironments);
    // TODO select first available environment in view
    vscode.window.showInformationMessage(`Environment ${e.label} removed`);
}

async function addEnvironment() {
    const name = await vscode.window.showInputBox({ prompt: 'Enter environment name' });
    if (!name) {
        return;
    }

    const config = vscode.workspace.getConfiguration();
    const environments = config.get<Record<string, Object>>('htr.environments') || {};
    var configObject = (new ConfigObject(name));
    environments[configObject.getName()] = configObject.getWritableObject();

    await config.update('htr.environments', environments, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Environment ${name} created`);
}

function mergeTemplateWithValues(template: any, values: any): any {
    if (typeof template === 'string') {
        return replacePlaceholders(template, values);
    } else if (typeof template === 'object') {
        for (let key in template) {
            template[key] = mergeTemplateWithValues(template[key], values);
        }
    }
    return template;
}

function replacePlaceholders(str: string, values: any): string {
    return str.replace(/\{\{(.+?)\}\}/g, (_, key) => {
        const value = key.split('.').reduce((acc: { [x: string]: any; }, part: string | number) => acc && acc[part], values);
        return value !== undefined ? value : `{{${key}}}`;
    });
}
