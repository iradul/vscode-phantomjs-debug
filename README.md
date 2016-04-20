# VS Code - Debugger for PhantomJS

## This procject is forked from [Debugger for Chrome](https://github.com/Microsoft/vscode-chrome-debug)

### Launch
You must specify:
* full path to PhantomJS executable - `runtimeExecutable`
* full path to PhantomJS JavaScript file - `file`
* root directory of your project - `webRoot`

If you write your code in TypeScript set `sourceMaps` to `true`. Also note that `ts` and `js` files have to be placed in the same directory.

If you are using PhantomJS modules you should put those in `node_modules` directory which should be child of your `webRoot` directory so that debugger can pick them up.
```json
{
    "version": "0.1.0",
	"configurations": [
		{
			"name": "Launch",
			"type": "phantomjs",
			"request": "launch",
			"file": "${workspaceRoot}/test.js",
            "webRoot": "${workspaceRoot}",
			"runtimeExecutable": "${workspaceRoot}/phantomjs.exe",
			"runtimeArgs": [],
			"sourceMaps": true
		}
	]
}
```

