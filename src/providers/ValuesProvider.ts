import * as vscode from 'vscode';
import ConfigObject from '../entity/ConfigObject';
import General from '../config/General';

export default class ValuesProvider implements vscode.TreeDataProvider<TreeItem> {
    public viewId = 'values';

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
      for (const environment in environments) {
          if (environment === General.selectedEnvironment) {
            var c:any = new ConfigObject('');
            c = environments[environment];
            for (var value in c.values) {
              this.data.push(new TreeItem(value + " : " + c.values[value]));
            }
          }
      }
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
