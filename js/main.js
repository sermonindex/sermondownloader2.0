/*
Author      : Sherebiah Tisbi & Vincent L
Date Modified: 3/14/22
Goal        : Main js for electron app for sermon downloader
Change Log  : CustomMenu3/11 
*/

//Lets App Open Browser Menu
const os = require('os');
const fs = require('fs');
const { dialog, remote, shell } = require('electron')

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
                label:'Sermonindex.net',
                click() { 
                    shell.openExternal('https://sermonindex.net')
                } 
            },
            {
                label:'Open Sermon Folder',
                click(){
                    // We can not access window.localStorage from our main process, so we are forced to use this workaround if we don't want to resort to using a file
                    window.webContents.executeJavaScript(`window.localStorage.getItem('sermon-download-path')`).then(path => {
                        if (path) { 
                            shell.openPath(path) 
                        } else {
                            dialog.showMessageBox(window, { message: 'Failed to open path because it has not been saved to storage.' })
                        }
                    })
                    
                }
            },
            {
                label:'Change Download Directory',
                click(){
                    dialog.showOpenDialog({ 
                        properties: ['openDirectory'] 
                    }).then(result => {
                        if (result.canceled) { return; }

                        // We can not access window.localStorage from our main process, so we are forced to use this workaround if we don't want to resort to using a file
                        // Escape the file path so JS doesnt eat the \

                        let path = result.filePaths[0].replaceAll('\\', '\\\\') 
                        window.webContents.executeJavaScript(`window.localStorage.setItem("sermon-download-path", "${ path }"); OnPathUpdate();`).then(() => {
                            dialog.showMessageBox(window, { message: 'Successfully set new download path! Please restart program.' })
                        })
                    })
                }
            },
            {type:'separator'}, 
            {
                label:'Dev Tools',
                click(){
                    window.webContents.openDevTools();
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