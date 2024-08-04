import * as vscode from 'vscode';
import General from '../config/General';

export default class EnvironmentsProvider implements vscode.TreeDataProvider<TreeItem> {
    public viewId = 'environments';

    _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem>();
    onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    data: TreeItem[] = [];
  
    constructor() {
        this.refresh();
    }

    public refresh() {
        const config = vscode.workspace.getConfiguration();
        const environments = config.get<Record<string, Object>>('htr.environments') || {};
        this.data = [];
        var counter = 0;
        for (const environment in environments) {
            this.data.push(new TreeItem(environment));
            if (counter === 0 && General.selectedEnvironment === '') {
              General.selectedEnvironment = environment;
            }
            counter++;
        }
        console.log("Constructor environments " + General.selectedEnvironment);
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
      return element;
    }
  
    getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
      if (element === undefined) {
        return this.data;
      }
      return [];
    }
  }
  
  class TreeItem extends vscode.TreeItem {

    constructor(label: string) {
      super(label);
    }
  }
