import { ProviderResult, TreeItem, TreeView, window, workspace, ConfigurationTarget } from "vscode";
import ProviderService from "./ProviderService";
import General from "../config/General";
//import { Environment } from "../types";

interface Environment {
    values: Record<string, string | object>;
    files: string[];
}

export default class TreeViewService {

    private providerService: ProviderService;
    private environmentsTreeView:TreeView<TreeItem>;
    private filesTreeView:TreeView<TreeItem>;
    private valuesTreeView:TreeView<TreeItem>;

    public constructor(providerService: ProviderService) {
        this.providerService = providerService;

        this.environmentsTreeView = window.createTreeView(
            this.providerService.getEnvironmentsProvider().viewId, 
            {
                treeDataProvider: this.providerService.getEnvironmentsProvider()
            }
        );

        this.filesTreeView = window.createTreeView(
            this.providerService.getFilesProvider().viewId, 
            {
                treeDataProvider: this.providerService.getFilesProvider()
            }
        );

        this.valuesTreeView = window.createTreeView(
            this.providerService.getValuesProvider().viewId, 
            {
                treeDataProvider: this.providerService.getValuesProvider()
            }
        );

        this.environmentsTreeView.onDidChangeSelection((event) => {
            const selectedItem = event.selection[0];
            if (selectedItem) {
                General.selectedEnvironment = selectedItem.label?.toString() || '';
                console.log("changed selection " + General.selectedEnvironment);
                this.providerService.getFilesProvider().refresh();
                this.providerService.getValuesProvider().refresh();
                this.providerService.getEnvironmentsProvider()._onDidChangeTreeData.fire(undefined);
            }
        }); 
    }

    public getEnvironmentsTreeView():TreeView<TreeItem> {
        return this.environmentsTreeView;
    }

    public getFilesTreeView():TreeView<TreeItem> {
        return this.filesTreeView;
    }

    public getValuesTreeView():TreeView<TreeItem> {
        return this.valuesTreeView;
    }

    public async deleteEnvironment(e:TreeItem) {
        const config = workspace.getConfiguration();
        var environments = config.get<Record<string, Object>>('htr.environments') || {};
        type keys = string;
        var newEnvironments : Record<keys, string | object> = {};
        for (var environment in environments) {
            if (environment !== (e.label || '')) {
                newEnvironments[environment] = environments[environment];
            }
        }
        config.update('htr.environments', newEnvironments, ConfigurationTarget.Workspace);

        General.selectedEnvironment = '';
        this.providerService.getEnvironmentsProvider().refresh();
        this.providerService.getValuesProvider().refresh();
        this.providerService.getFilesProvider().refresh();
        window.showInformationMessage(`Environment ${e.label} removed`);

        const root = this.providerService.getEnvironmentsProvider().getRoot();
        this.environmentsTreeView.reveal(root, {focus: true, select:true, expand: true});
        this.providerService.getEnvironmentsProvider()._onDidChangeTreeData.fire(undefined);
    }

    public async deleteFile(e:TreeItem) {
        const config = workspace.getConfiguration();
        var environments = config.get<Record<string, Environment>>('htr.environments') || {};


        const se = General.selectedEnvironment;
        var newFiles = [];
        for (const file in environments[se].files) {
            if (environments[se].files[file] !== e.label) {
                newFiles.push(environments[se].files[file]);
            }
        }

        const newEnvironments = {
            ...environments,
            [General.selectedEnvironment]: {
                ...environments[General.selectedEnvironment],
                files: newFiles
            }
        };

        config.update('htr.environments', newEnvironments, ConfigurationTarget.Workspace);

        General.selectedEnvironment = '';
        this.providerService.getEnvironmentsProvider().refresh();
        this.providerService.getValuesProvider().refresh();
        this.providerService.getFilesProvider().refresh();
        window.showInformationMessage(`File ${e.label} removed from environment ${se}`);

        const root = this.providerService.getEnvironmentsProvider().getRoot();
        this.environmentsTreeView.reveal(root, {focus: true, select:true, expand: true});
        this.providerService.getEnvironmentsProvider()._onDidChangeTreeData.fire(undefined);
    }

    public async deleteValue(e:TreeItem) {
        const config = workspace.getConfiguration();
        var environments = config.get<Record<string, Environment>>('htr.environments') || {};

        const s:string = e.label?.toString() || '';
        const bits = s.split(":");

        const se = General.selectedEnvironment;
        type keys = string;
        var newValues: Record<keys, string | object> = {};
        for (const i in environments[se].values) {
            if (i !== bits[0].trim()) {
                newValues[i] = environments[se].values[i];
            }
        }

        const newEnvironments = {
            ...environments,
            [General.selectedEnvironment]: {
                ...environments[General.selectedEnvironment],
                values: newValues
            }
        };

        config.update('htr.environments', newEnvironments, ConfigurationTarget.Workspace);

        General.selectedEnvironment = '';
        this.providerService.getEnvironmentsProvider().refresh();
        this.providerService.getValuesProvider().refresh();
        this.providerService.getFilesProvider().refresh();
        window.showInformationMessage(`Value ${e.label} removed from environment ${se}`);

        const root = this.providerService.getEnvironmentsProvider().getRoot();
        this.environmentsTreeView.reveal(root, {focus: true, select:true, expand: true});
        this.providerService.getEnvironmentsProvider()._onDidChangeTreeData.fire(undefined);
    }
}