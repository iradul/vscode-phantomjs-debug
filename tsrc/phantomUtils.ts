import {chromeUtils, utils} from 'vscode-chrome-debug-core';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Holds up webRoot, webRoot/node_modules and all its subdirectories up to level 3
 * where source files could be potentially found
 */
let allPaths: string[] = undefined;

/**
 * Fills up [rootPaths]
 */
function getAllDirectories(srcdir: string, maxlvl: number, lvl = 1) {
    if (lvl > maxlvl) return;
    allPaths.push(srcdir);
    const dirs = fs.readdirSync(srcdir).filter((fileOrDir) => fs.statSync(path.join(srcdir, fileOrDir)).isDirectory())
        .map((dir) => path.join(srcdir, dir));
    dirs.forEach((dir) => getAllDirectories(dir, maxlvl, lvl + 1));
}

/**
 * Use moke function since PhantomJS has to
 * find source files in a very different way
 */
chromeUtils.targetUrlToClientPath = function targetUrlToClientPath(webRoot: string, aUrl: string): string {
    if (!aUrl || !webRoot) {
        return '';
    }

    // initialize [allPaths] where scripts should be located
    if (!allPaths) {
        allPaths = [ webRoot ];
        const nodeModulesPath = path.join(webRoot, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) getAllDirectories(nodeModulesPath, 3);
    }

    // extract script name
    const m = /phantomjs:\/\/(platform|code)\/(.*)/.exec(aUrl);
    if (!m) {
        return '';
    }

    let scriptName = m[2];
    // try to find script in all posible paths that is
    // under webRoot and up to 3 levels under webRoot/node_modules
    for (let i = 0; i < allPaths.length; i++) {
        const
            dir = allPaths[i],
            clientPath = path.join(dir, scriptName);
        if (utils.existsSync(clientPath)) {
            return utils.canonicalizeUrl(clientPath);
        }
    }

    return '';
};
