import { Environment } from "../types";

export default class ConfigObject {

    public name:string = '';
    public files:[] = [];
    public values:Object = {};

    constructor(name: string){
        this.name = name;
    }

    public getName() {
        return this.name;
    }

    public getWritableObject() {
        return {
            files: this.files,
            values: this.values
        } as Environment;
    }
}