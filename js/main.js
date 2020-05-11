/*
Author      : Sherebiah Tisbi
Datw Written: 04/27/2020
Goal        : Main js for electron app for sermon downloader
Change Log  : None
*/

const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
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
    window.setMenu(null);
    window.loadFile('index.html');
    //console.log(screen.getPrimaryDisplay());
    //console.log(os.platform());
}

ipcMain.handle('showdialog', async (event, args) => { 
    console.log(args);
    var options = args;
    dialog.showOpenDialog(window, options);    
});

app.on('ready',createWindow);

//Quit the app (main porcess) when all windows are closed
app.on('window-all-closed', () => {
    app.quit();
    // if (process.platform != 'darwin'){
    //     app.quit();
    // }
});