/*
Author      : Sherebiah Tisbi
Datw Written: 04/27/2020
Goal        : Main js for electron app for sermon downloader
Change Log  : None
*/

 //handle setupevents as quickly as possible
 const setupEvents = require('../js/setupEvents');
 if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }

const { app, BrowserWindow, screen } = require('electron');
var path = require('path');
var window;

//create main GUI window
function createWindow() {
    var display = screen.getPrimaryDisplay();
    window = new BrowserWindow({
        width: display.bounds.width - 500,
        height: display.bounds.height - 200,
        webPreferences: {
            nodeIntegration: true
        },
        icon:'../images/sermonindex-logo1.png'
    });
    // window.setMenu(null);
    window.loadFile('index2.html');
    //console.log(screen.getPrimaryDisplay());
    //console.log(os.platform());
}



app.on('ready',createWindow);

//Quit the app (main porcess) when all windows are closed
app.on('window-all-closed', () => {
    app.quit();
    // if (process.platform != 'darwin'){
    //     app.quit();
    // }
});

/* DEPRECATED CODE
// ipcMain.handle('showdialog', async (event, args) => {
//     console.log(args);
//     var options = args;
//     dialog.showOpenDialog(window, options);
// });

// ipcMain.handle('openthesite', async (event, args) => {
//     console.log(args);
//     console.log(args['url']);
//     switch (process.platform) {
//         case 'darwin':
//             machine.execSync('open ' + args['url']);
//             break;
//         case 'win32':
//             machine.execSync('start ' + args['url']);
//             break;
//         case 'linux':
//             machine.execSync('xdg-open www.sermonindex.com');
//             break;
//     }
// });
*/