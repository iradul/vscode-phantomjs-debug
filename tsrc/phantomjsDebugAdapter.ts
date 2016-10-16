import {
    ChromeDebugAdapter,
    logger,
    utils,
} from 'vscode-chrome-debug-core';
import {
    spawn,
    ChildProcess,
} from 'child_process';
import {
    ILaunchRequestArgs,
} from './phantomjsDebugInterfaces';
import {DebugProtocol} from 'vscode-debugprotocol';
import * as path from 'path';

export class PhantomJSDebugAdapter extends ChromeDebugAdapter {
    /** PhantomJS process */
    private _phantomJsProcess: ChildProcess;
    /** Initial script file with full path */
    private _pjsInitialScriptFile: string;
    /** Initial phantomjs script URL like for example: phantomjs://code/test.js */
    private _pjsInitialScriptUrl: string;
    /** All phantom's URLs that are corrupted. */
    private _pjsScriptURLs = new Map<string, boolean>();
    /** All phantom's script IDs that are corrupted. */
    private _pjsScriptIDs = new Map<string, boolean>();
    /** Latest transmitted console message */
    private _latestConsoleMessage: any;

    /**
     * Got to hook console message since PhantomJS uses old version of protocol
     */
    protected hookConnectionEvents() {
        this.chrome.Console.onMessageAdded((msg) => this.onConsoleMessageAdded(msg));
        (<any>this.chrome.Console).onMessageRepeatCountUpdated((msg) => this.onConsoleMessageRepeatCountUpdated(msg));

        return super.hookConnectionEvents();
    }

    /**
     * Have to additionally run Console client
     */
    protected runConnection() {
        let arr = super.runConnection();
        arr.push(this.chrome.Console.enable());
        return arr;
    }

    /**
     * To set a breakpoints in target we have to fix breakpoint line numbers
     * because PhantomJS wraps its JavaScripts with function that then moves
     * its source code by one line down. After we get response from target we'll
     * have to reverse the process namely we'll have to move breakpoints back one
     * line upwards
     */
    protected addBreakpoints(url: string, breakpoints: DebugProtocol.SourceBreakpoint[]) {
        let shouldHandle = this._pjsScriptURLs.has(url);
        if (shouldHandle) {
            breakpoints.forEach((b) => {
                b.line++;
                b.column = 0;
            });
        }
        return super.addBreakpoints(url, breakpoints)
            .then(responses => {
                if (shouldHandle) responses.forEach((r) => r.actualLocation.lineNumber--);
                return Promise.resolve(responses);
            });
    }

    /**
     * When script gets parsed it's ideal time to track it down
     */
    protected onScriptParsed(script: any): void {
        if (script.url && /^phantomjs:\/\/platform/.test(script.url)) {
            // save all corrupted scripts
            // all [node_modules] script has corrupted source
            this._pjsScriptURLs.set(script.url, true);
            this._pjsScriptIDs.set(script.scriptId, true);
        } else if (script.url === this._pjsInitialScriptUrl) {
            // initial script is corrupted
            this._pjsScriptURLs.set(script.url, true);
            this._pjsScriptIDs.set(script.scriptId, true);

            // lets delay __run call just to make sure our breakpoints are passed to phantom, if we did set any though
            setTimeout(() => {
                this.evaluate({
                    expression: '__run()',
                });
            }, 1000);
        }
        // we also need to mock source file descovery process
        // that happens in super class, see [phantomUtils.ts]
        super.onScriptParsed(script);
    }

    /**
     * When target is paused we need to inform client but with proper line
     * so we need to move all PhantomJS JavaScript lines one line down
     * similar to what we're doing in [addBreakpoints] only this time it's
     * a one way process
     */
    protected onPaused(notification: any): void {
        if (this._pjsScriptIDs.has(notification.callFrames[0].location.scriptId)) {
            notification.callFrames[0].location.lineNumber--;
        }
        return super.onPaused(notification);
    }

    /**
     * Repeated messages should be retransmitted
     */
    private onConsoleMessageRepeatCountUpdated(msg: any) {
        if (this._latestConsoleMessage) {
            if (!this._latestConsoleMessage.args || this._latestConsoleMessage.args.length === 0) {
                this._latestConsoleMessage.args = [{ type: 'string', value: this._latestConsoleMessage.text }];
            }
            super.onConsoleAPICalled(this._latestConsoleMessage);
        }
    }

    /**
     * Console message must be converted before [onConsoleAPICalled] can swallow it
     */
    private onConsoleMessageAdded(msg: any): void {
        // convert message so that
        // super can digest it
        let fixedmsg = msg.message;
        if (fixedmsg.parameters) {
            fixedmsg.args = fixedmsg.parameters;
            delete fixedmsg.parameters;
        } else {
            fixedmsg.args = [ {type: 'string', value: fixedmsg.text } ];
        }
        this._latestConsoleMessage = fixedmsg;
        super.onConsoleAPICalled(fixedmsg);
    }

    public launch(args: ILaunchRequestArgs): Promise<void> {
        args.sourceMapPathOverrides = args.sourceMapPathOverrides;
        return super.launch(args).then(() => {
            const pathToExecutable = args.runtimeExecutable;
            if (!pathToExecutable) {
                return utils.errP(`Can't find PhantomJS executable - please properly set the "runtimeExecutable" field in the launch config.`);
            }

            const port = args.port || 9222;
            const pjsArgs: string[] = ['--remote-debugger-port=' + port];

            if (args.runtimeArgs) {
                pjsArgs.push(...args.runtimeArgs);
            }

            this._pjsInitialScriptFile = path.resolve(args.file);
            this._pjsInitialScriptUrl = 'phantomjs://code/' + path.basename(this._pjsInitialScriptFile);

            pjsArgs.push(this._pjsInitialScriptFile);

            logger.log(`spawn('${pathToExecutable}', ${JSON.stringify(pjsArgs) })`);
            this._phantomJsProcess = spawn(pathToExecutable, pjsArgs, {
                detached: true,
                stdio: ['ignore'],
            });
            this._phantomJsProcess.unref();
            this._phantomJsProcess.on('error', (err) => {
                const errMsg = 'PhantomJS error: ' + err;
                logger.error(errMsg);
                this.terminateSession(errMsg);
            });
            this._phantomJsProcess.on('close', () => {
                super.disconnect();
            });

            return this.doAttach(port, this._pjsInitialScriptFile, args.address);
        });
    }

    public disconnect(): void {
        if (this._phantomJsProcess) {
            this._phantomJsProcess.kill('SIGINT');
            this._phantomJsProcess = null;
        }

        return super.disconnect();
    }
}