const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'SermonindexGUI-win32-x64/'),
    authors: 'Sherebiah Tisbi',
    outputDirectory: path.join(outPath, 'windows-installer'),
    noMsi : false,
    exe: 'SermonindexGUI.exe',
    setupExe: 'SermonindexGUI_Setup.exe',
    setupIcon: path.join(rootPath, 'images','sermonindex-logo.ico')
  })
}