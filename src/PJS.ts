import {ChromeDebugAdapter} from './chrome/chromeDebugAdapter';
import {ISetBreakpointsArgs} from './chrome/debugAdapterInterfaces';
import * as path from 'path';

/**
 * Class defines static methods and properties used to inject special code to Visual Studio Code Chrome Debugger. This makes possible to drive PhantomJS Debugger which is very similar to Chrom Debugger.
 * - PhantomJS debugger has to be triggered with __run call. This call has to be made once when initial script is parsed by debugger and when all breakpoints are set if there are any.
 * - When mapping TypeScripts to JavaScripts VSC-PJS Debugger has to search forward instead of backward, backward is default for VSC Chrome debugger
 * - PhantomJS doesn’t like columns when setting up breakpoint in mapping mode.
 * - Most scripts in PhantomJS are "corrupted" with artificially added function wrappers. This includes initial script which is wrapped with __run() function but also all module scripts. This is done under the PJS hood so that scripts can become CommonJS modules. Also this means that the original source code is pushed by one line down when it executes so VSC-PJS Debugger needs to take care of this when it deals with breakpoints. When we place breakpoint in our VSC editor (client), VSC sends all breakpoints to VSC debugger (VSC-PJS Debugger - which is basically this extension). Then VSC debugger transforms those breakpoints and forward them to the PhantomJS Debugger (target – that’s running PhantomJS instance). After PhantomJS Debugger receives those breakpoints it sets them up and reply them back to VSC debugger with all breakpoints he successfully set. VSC debugger then transforms back these breakpoints to match the original source code and sends them back to VSC editor. Finally VSC editor confirms which breakpoints are set and where they are actually located and it also disables ones that have failed.
*/
export class PJS {
    /** PhantomJS mapping works with Bias.LEAST_UPPER_BOUND=2 */
    public static DefaultBias = 2;

    /** Initial script URL. */
    private static _initScriptURL: string;
    /** All phantom's URLs that are corrupted. */
    private static _scriptURLs = new Map<string, boolean>();
    /** All phantom's script IDs that are corrupted. */
    private static _scriptIDs = new Map<string, boolean>();

    /**
     * Initial script is corrupted with __run() function so we have to deal with it differently.
     * We'll use this url to detect this function.
    */
    static setInitialURL(basename: string): void {
        PJS._initScriptURL = "phantomjs://code/" + basename;
    }

    /**
     * When we get information about initial script it's good time to actually call __run().
     * When we get information about module script memorize it for later use.
     */
    static scriptParsed(script: Chrome.Debugger.Script, adapter: ChromeDebugAdapter): void {
        // all [node_modules] script has corrupted source
        if (/^phantomjs:\/\/platform/.test(script.url)) {
            PJS._scriptURLs.set(script.url, true);
            PJS._scriptIDs.set(script.scriptId, true);
        }
        // initial script has corrupted source
        else if (script.url === PJS._initScriptURL) {
            PJS._scriptURLs.set(script.url, true);
            PJS._scriptIDs.set(script.scriptId, true);

            // lets delay __run call just to make sure our breakpoints are passed to phantom, if we did set any though
            setTimeout(function() {
                adapter.evaluate({
                    expression: "__run()"
                });
            }, 1000);
        }
    }

    /**
     * When PhantomJS Debugger (target) pauses execution caused by breakpoint triggering we need to fix breakpoint before we send it to back to VS editor (client).
     */
    static debuggerPaused(notification: Chrome.Debugger.PausedParams): void {
        if (PJS._scriptIDs.has(notification.callFrames[0].location.scriptId)) {
            notification.callFrames[0].location.lineNumber--;
        }
    }

    /**
     * To make debugging possible we need to map phantom's URLs to local files if possible.
     *   phantomjs://code/abc.js -> $PATH/abc.js
     *   phantomjs://platform/xyz.js -> $PATH/node_modules/xyz.js
     */
    static targetUrlToClientPath(webRoot: string, aUrl: string, existsSync): string {
        if (aUrl.startsWith('phantomjs://')) {
            var aUrlFixed = aUrl.replace(/^phantomjs:\/\/code\//, '');
            aUrlFixed = aUrlFixed.replace(/^phantomjs:\/\/platform/, 'node_modules');
            aUrlFixed = path.resolve(webRoot, aUrlFixed);
            if (existsSync(aUrlFixed)) {
                return aUrlFixed;
            }
        }
        return '';
    }

    /**
     * When client sets breakpoint(s) we have to prepare them and transform them to target breakpoints.
     */
    static setBreakpoints(args: ISetBreakpointsArgs): void {
        if (PJS._scriptURLs.has(args.source.path)) {
            args.lines.forEach((v,i,lines) => {
                lines[i]++;
            })

            if (/.ts$/.test(args.authoredPath)) {
                // for some reason PhantomJS debugger doesn't like exact column number when we're dealing with type scripts.
                args.cols.forEach((v,i,cols) => {
                    cols[i] = 0;
                })
            }
        }
    }

    /**
     * When PhantomJS (target) replies with breakpoints we have to transform them back to client breakpoints.
     */
    static _chromeBreakpointResponsesToODPBreakpoints(url: string, response: Chrome.Debugger.SetBreakpointByUrlResponse): void {
        if (PJS._scriptURLs.has(url)) {
            response.result.locations[0].lineNumber--;
        }
    }
}