/*
Author      : Sherebiah Tisbi & Vincent L
Date Modified: 3/14/22
Goal        : Main js for electron app for sermon downloader
Change Log  : CustomMenu3/11 
*/

// Lets App Open Browser Menu
const path = require('path');
const { app, BrowserWindow, dialog, Menu, screen, shell } = require('electron');
const logger = require('electron-log/main');
const isSmokeTest = process.argv.includes('--smoke-test');

logger.initialize();

// handle setup events as quickly as possible
const setupEvents = require('../js/setupEvents');
if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

let window;

function getWindowIconPath() {
    const imageName = process.platform === 'win32'
        ? 'sermonindex-logo.ico'
        : 'sermonindex-logo1.png';

    return path.join(__dirname, '..', 'images', imageName);
}

//create main GUI window
function createWindow() {
    const display = screen.getPrimaryDisplay();
    const width = Math.max(1100, display.workAreaSize.width - 300);
    const height = Math.max(700, display.workAreaSize.height - 100);

    window = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
        },
        icon: getWindowIconPath(),
        show: false
    });

    window.once('ready-to-show', () => {
        window.show();
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (isSmokeTest) {
        window.webContents.once('did-finish-load', () => {
            window.webContents.executeJavaScript(`
                new Promise((resolve) => {
                    const deadline = Date.now() + 8000;

                    const waitForSpeaker = setInterval(() => {
                        const speaker = document.querySelector('#tblSpeakers td[data-speaker]');
                        if (!speaker && Date.now() <= deadline) {
                            return;
                        }

                        clearInterval(waitForSpeaker);
                        if (!speaker) {
                            resolve({ speaker: null, sermons: 0 });
                            return;
                        }

                        speaker.click();

                        const waitForSermons = setInterval(() => {
                            const sermonRows = document.querySelectorAll('#tblSermons tbody td:first-child');
                            if (sermonRows.length === 0 && Date.now() <= deadline) {
                                return;
                            }

                            clearInterval(waitForSermons);
                            const firstActionCell = sermonRows[0];
                            resolve({
                                speaker: speaker.textContent.trim(),
                                sermons: sermonRows.length,
                                playButtons: document.querySelectorAll('#tblSermons tbody .sermon-action-play').length,
                                downloadButtons: document.querySelectorAll('#tblSermons tbody .sermon-action-download').length,
                                pdfButtons: document.querySelectorAll('#tblSermons tbody .sermon-action-pdf').length,
                                firstRowButtons: firstActionCell
                                    ? [...firstActionCell.querySelectorAll('button')].map((button) => button.className)
                                    : [],
                            });
                        }, 250);
                    }, 250);
                });
            `).then((result) => {
                logger.info(`Smoke test speaker load result: ${ JSON.stringify(result) }`);
            }).catch((error) => {
                logger.error(`Smoke test failed: ${ error }`);
            }).finally(() => {
                setTimeout(() => app.quit(), 500);
            });
        });
    }

    // Custom App Menu
    const menu = Menu.buildFromTemplate([
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
                            shell.openPath(path).then(errorMessage => {
                                if (errorMessage) {
                                    dialog.showMessageBox(window, { message: errorMessage });
                                }
                            });
                        } else {
                            dialog.showMessageBox(window, { message: 'Failed to open path because it has not been saved to storage.' })
                        }
                    })
                    
                }
            },
            {
                label:'Change Download Directory',
                click(){
                    dialog.showOpenDialog(window, {
                        properties: ['openDirectory'] 
                    }).then(result => {
                        if (result.canceled) { return; }

                        // We can not access window.localStorage from our main process, so we are forced to use this workaround if we don't want to resort to using a file
                        const selectedPath = JSON.stringify(result.filePaths[0]);
                        window.webContents.executeJavaScript(`window.localStorage.setItem("sermon-download-path", ${selectedPath}); if (typeof OnPathUpdate === "function") { OnPathUpdate(); }`).then(() => {
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

    window.loadFile('index2.html');
}

app.whenReady().then(createWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

//Quit the app (main process) when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
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
