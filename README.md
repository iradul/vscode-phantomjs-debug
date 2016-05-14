# VS Code - Debugger for PhantomJS

### Install
Download and install [VSC](https://code.visualstudio.com/)

Open up VSC and install this extension:
 - open VSC
 - press CTRL+SHIFT+P, enter "install" and press Enter alternatively click on the button in bottom left corner and pick first option

![alt step1](https://cloud.githubusercontent.com/assets/2411422/15265838/37150d2e-195e-11e6-8aa7-9de81418486d.png)
 - enter "phantom", wait a moment VSC will open up extension info box then click on the small button in the bottom right corner of the box

![alt step2](https://cloud.githubusercontent.com/assets/2411422/15265841/3a547e70-195e-11e6-8648-28e2c2709ecc.png)

### Launch
Download [PhantomJS](http://phantomjs.org/download.html) executable.

Open your working directory in VSC. This can be done from menu or from console by typing `code [path to directory]`. If you are already in working directory just type `code .`.

Setup up VSC debugger:
 - click Debug button or press CTRL+SHIFT+D
 - create launch.json file manualy under ./.vscode/launch.json or by clicking on the small button that looks like cog then pick PhantomJS from the list that will open up
 
![alt creating launch.json](https://cloud.githubusercontent.com/assets/2411422/15265900/df27964c-1960-11e6-9327-b4f30b9c4545.png) 
 - edit launch.json by specifying :
   - full path to PhantomJS executable that you previously downloaded - `runtimeExecutable`
   - full path to PhantomJS JavaScript entrypoint file - `file`
   - root directory of your project - `webRoot`

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

### Debug
Place breakpoints in your script(s) and press F5 to fire up phantom and start debugging.
VSC debugger itself is very similar to javascript debuggers found in popular browsers like Google Chrome or Firefox for example.
![alt debugging](https://cloud.githubusercontent.com/assets/2411422/15265986/975537c2-1963-11e6-8ece-97910cded4da.png)
