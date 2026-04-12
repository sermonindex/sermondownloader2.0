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
  const rootPath = path.resolve(__dirname, '..')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'sermondownloader2.1-win32-x64'),
    authors: 'SermonIndex',
    outputDirectory: path.join(outPath, 'windows-installer'),
    noMsi: true,
    exe: 'sermondownloader2.1.exe',
    setupExe: 'Setup_SermonDownloader2.1.exe',
    setupIcon: path.join(rootPath, 'images','sermonindex-logo.ico')
  })
}
