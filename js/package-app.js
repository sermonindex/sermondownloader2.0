const path = require('path');
const { packager } = require('@electron/packager');

const [, , platform, arch, iconArg, asarArg] = process.argv;

if (!platform || !arch || !iconArg) {
  console.error('Usage: node js/package-app.js <platform> <arch> <iconPath> [asar]');
  process.exit(1);
}

(async () => {
  try {
    const appPaths = await packager({
      dir: path.resolve(__dirname, '..'),
      name: 'sermondownloader2.1',
      electronVersion: '39.8.5',
      overwrite: true,
      asar: asarArg === 'asar',
      platform,
      arch,
      icon: path.resolve(__dirname, '..', iconArg),
      out: path.resolve(__dirname, '..', 'release-builds'),
    });

    console.log(appPaths.join('\n'));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
})();
