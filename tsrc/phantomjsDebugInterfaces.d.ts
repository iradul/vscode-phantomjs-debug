import * as Core from 'vscode-chrome-debug-core';

export interface ILaunchRequestArgs extends Core.ILaunchRequestArgs {
    runtimeArgs?: string[];
    runtimeExecutable?: string;
    file?: string;
    address?: string;
    port?: number;
    env?: string;
}