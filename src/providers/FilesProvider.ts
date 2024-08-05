import { TreeItem, EventEmitter, Event, workspace, TreeDataProvider, ProviderResult } from 'vscode';
import ConfigObject from '../entity/ConfigObject';
import General from '../config/General';
import { Environment } from '../types';

export default class FilesProvider implements TreeDataProvider<TreeItem> {
    public viewId = 'files';

    _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem>();
    onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    data: TreeItem[] = [];
  
    constructor() {
        this.refresh();
    }

    public refresh() {
        const config = workspace.getConfiguration();
        const environments = config.get<Record<string, Environment>>('htr.environments') || {};
        this.data = [];
        const sE = General.selectedEnvironment;
        for (const environment in environments) {
            if (environment === General.selectedEnvironment) {
              for (var file in environments[environment].files) {
                this.data.push(new TreeItem(environments[environment].files[file]));
              }
            }
        }
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeItem): TreeItem|Thenable<TreeItem> {
      return element;
    }
  
    getChildren(element?: TreeItem|undefined): ProviderResult<TreeItem[]> {
      if (element === undefined) {
        return this.data;
      }
      return [];
    }
  }
