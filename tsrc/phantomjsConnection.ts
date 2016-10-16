import {
    ChromeConnection,
    utils,
} from 'vscode-chrome-debug-core';

export class PhantomJSConnection extends ChromeConnection {
    constructor() {
        super((address: string, port: number) => {
            /**
             * make sure phantomjs is started and it's ready to be hooked to target
             * no fancy stuff, just wait until target remote debug page becomes avaliable
             */
            return utils.getURL(`http://${address}:${port}`).then(r => {
                return Promise.resolve<string>(`ws://${address}:${port}/devtools/page/1`);
            });
        });
    }
}