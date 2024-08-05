import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import General from './config/General';
import ProviderService from './service/ProviderService';
import TreeViewService from './service/TreeViewService';
import { Environment } from './types';
import { stdout } from 'process';
import { exec } from 'child_process';
import { promisify } from 'util';

var providerService = new ProviderService();
var treeViewService = new TreeViewService(providerService);
let previewPanel: vscode.WebviewPanel | undefined;

const execPromise = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    let activeEditor = vscode.window.activeTextEditor;

    // TODO check if helm is installed
    // TODO check if kubectl is present
    // TODO check if a helm chart is present (Chart.yaml file that contains name info)

    vscode.workspace.onDidChangeConfiguration(e => {
        console.log("onDidChangeConfiguration " + General.selectedEnvironment);
        providerService.getEnvironmentsProvider().refresh();
        providerService.getValuesProvider().refresh();
        providerService.getFilesProvider().refresh();
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            triggerUpdate(activeEditor.document);
        }
    });

    var addEnvironmentCommand = vscode.commands.registerCommand(
        'htr.addEnvironment', 
        async () => {
            await providerService.addEnvironment();
        }
    );

    var deleteEnvironmentCommand = vscode.commands.registerCommand(
        'htr.deleteEnvironment', 
        async (e:vscode.TreeItem) => {
            await treeViewService.deleteEnvironment(e);
        }
    );

    var addFileCommand = vscode.commands.registerCommand(
        'htr.addFile',
        async () => {
            await providerService.addFile();
        }
    );

    var deleteFileCommand = vscode.commands.registerCommand(
        'htr.deleteFile', 
        async (e:vscode.TreeItem) => {
            await treeViewService.deleteFile(e);
        }
    );

    var addValueCommand = vscode.commands.registerCommand(
        'htr.addValue',
        async () => {
            await providerService.addValue();
        }
    );

    var editValueCommand = vscode.commands.registerCommand(
        'htr.editValue',
        async (e) => {
            await providerService.editValue(e);
        }
    );

    var deleteValueCommand = vscode.commands.registerCommand(
        'htr.deleteValue', 
        async (e:vscode.TreeItem) => {
            await treeViewService.deleteValue(e);
        }
    );

    context.subscriptions.push(
        treeViewService.getEnvironmentsTreeView(),
        treeViewService.getFilesTreeView(),
        treeViewService.getValuesTreeView(),

        addEnvironmentCommand,
        deleteEnvironmentCommand,
        addFileCommand,
        deleteFileCommand,
        addValueCommand,
        editValueCommand,
        deleteValueCommand
      );

      const togglePreviewCommand = vscode.commands.registerCommand('htr.togglePreview', () => {
        if (previewPanel) {
            previewPanel.dispose();
            previewPanel = undefined;
        } else {
            if (activeEditor) {
                triggerUpdate(activeEditor.document);
            }
        }
    });

    context.subscriptions.push(togglePreviewCommand);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor && previewPanel) {
            triggerUpdate(editor.document);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document && previewPanel) {
            triggerUpdate(event.document);
        }
    }, null, context.subscriptions);

    function triggerUpdate(document: vscode.TextDocument) {
        const uppercaseText = document.getText().toUpperCase();
        updateUppercasePreview(uppercaseText);
    }

    async function updateUppercasePreview(text: string) {
        if (!previewPanel) {
            previewPanel = vscode.window.createWebviewPanel(
                'templatePreview',
                'Template Preview',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            previewPanel.onDidDispose(() => {
                previewPanel = undefined;
            }, null, context.subscriptions);
        }

        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};

        const se = General.selectedEnvironment;

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }
    
        const fileUri = activeEditor.document.uri;
        const absolutePath = fileUri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    
        if (!workspaceFolder) {
            vscode.window.showInformationMessage('No workspace folder found.');
            return;
        }
    
        const workspacePath = workspaceFolder.uri.fsPath;
        const relativePath = vscode.workspace.asRelativePath(fileUri, false);
        let workspaceDirectory = workspacePath;
        let relativeFilePath = relativePath;
    
        const files = environments[se].files.join(" -f ");
        let commandFiles = '';
        if (files !== '') {
            commandFiles = '-f ' + files;
        }

        let valuesCommand = '';
        type keys = string;
        var valuesObject:Record<keys, string | object> = environments[se].values as Record<keys, string | object>;

        for (var key in valuesObject) {
            valuesCommand += ' --set ' + key + "=" + valuesObject[key];
        }

        var command = 'helm template -s ' + relativeFilePath + ' . ' + commandFiles + valuesCommand;
        console.log(command);
        
        const cp = require('child_process');
        cp.exec(command,{cwd:workspaceDirectory}, (err: string, stdout: string, stderr: string) => {
            if (err) {
                console.log('error: ' + err);
                if (previewPanel) {
                    previewPanel.webview.html = getWebviewContent(err);
                }
                return;
            }

            if (previewPanel) {
                previewPanel.webview.html = getWebviewContent(stdout);
            }
            
        });
    }

    function getWebviewContent(text: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Template Preview</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 10px;
                }
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
            </style>
        </head>
        <body>
            <pre>${text}</pre>
        </body>
        </html>`;
    }

    treeViewService.getEnvironmentsTreeView().onDidChangeSelection((event) => {
        const selectedItem = event.selection[0];
        if (selectedItem) {
            General.selectedEnvironment = selectedItem.label?.toString() || '';
            console.log("changed selection " + General.selectedEnvironment);
            providerService.getFilesProvider().refresh();
            providerService.getValuesProvider().refresh();
            providerService.getEnvironmentsProvider()._onDidChangeTreeData.fire(undefined);
            const activeEditor = vscode.window.visibleTextEditors[0] || vscode.window.activeTextEditor;
            if (activeEditor) {
                triggerUpdate(activeEditor.document);
            }
        }
    }); 
}

export function deactivate() {}