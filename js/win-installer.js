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
    appDirectory: path.join(outPath, 'sermon-downloader-2.0-win32-x64/'),
    authors: 'Sherebiah Tisbi',
    outputDirectory: path.join(outPath, 'windows-installer'),
    noMsi : false,
    exe: 'sermon-downloader-2.0.exe',
    setupExe: 'Setup_SermonDownloader2.exe',
    setupIcon: path.join(rootPath, 'images','sermonindex-logo.ico')
  })
}