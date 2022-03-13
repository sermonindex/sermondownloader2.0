/*
Author      : Vincent L
Date Modified: 3/11/22
Goal        : Main js for electron app for sermon downloader
Change Log  : CustomMenu3/11
*/

//Lets App Open Browser Menu
const {shell} = require('electron')
const os = require('os');
const fs = require('fs');
const {dialog} = require('electron')
const { remote } = require('electron')



 //handle setupevents as quickly as possible
 const setupEvents = require('../js/setupEvents');
 if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }

const { app, BrowserWindow, screen, Menu } = require('electron');
var path = require('path');
var window;

//create main GUI window
function createWindow() {
    var display = screen.getPrimaryDisplay();
    window = new BrowserWindow({
        width: display.bounds.width - 500,
        height: display.bounds.height - 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
        },
        icon:'../images/sermonindex-logo1.png'
    });

    //Custom App Menu
     var menu = Menu.buildFromTemplate([
    {
        label: 'Menu',
            submenu: [
            {
                label:'SermonIndex.net',
                click() { 
                    shell.openExternal('https://sermonindex.net')
                } 
            },
            {
                label:'Open Sermon Folder',
                click(){
                    shell.openPath(os.homedir() + '/SermonIndex_Sermons/') 
                }
            },
            {
                label:'File Test',
                click(){
                    dialog.showOpenDialog({
                   properties: ['openDirectory']
                    }).then(result => {
                   console.log(result.filePaths)
                   })
                }

            },
            {
                label:'Dev Tools',
                click(){
                    createWindow.webContents.toggleDevTools()();
                }
            },
            {type:'separator'}, 
            {
                label:'Close App', 
                click() { 
                    app.quit() 
                } 
            }
        ]
    }
  ]) 
  Menu.setApplicationMenu(menu); 
    // window.setMenu(null);
    window.loadFile('index2.html');
    //console.log(screen.getPrimaryDisplay());
    //console.log(os.platform());
}



app.on('ready',createWindow);

//Quit the app (main process) when all windows are closed
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