import {
    ChromeDebugSession,
    UrlPathTransformer,
    BaseSourceMapTransformer,
} from 'vscode-chrome-debug-core';
import * as path from 'path';
import {PhantomJSConnection} from './phantomjsConnection';
import {PhantomJSDebugAdapter} from './phantomjsDebugAdapter';
import './phantomUtils';

ChromeDebugSession.run(ChromeDebugSession.getSession(
    {
        adapter: PhantomJSDebugAdapter,
        chromeConnection: PhantomJSConnection,
        extensionName: 'debugger-for-phantomjs',
        logFilePath: path.resolve(__dirname, '../../vscode-phantomjs-debug.txt'),
        pathTransformer: UrlPathTransformer,
        sourceMapTransformer: BaseSourceMapTransformer,
    }));