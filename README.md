<img src="https://raw.githubusercontent.com/sermonindex/sermondownloader2.0/master/_app-image.jpg">

# Sermonindex Downloader 2.1

This project is developed to provide easy app based navigation for all sermons available on <a href="https://www.sermonindex.net">sermonindex</a>. The goal is to aid users to get a local copy of sermons by downloading them. User has choice to download single or all sermons of a desired speaker. 
This app is cross platform and should work seamlessly on Windows, MacOS and Linux (debian) without any issues.

## Getting Started



### Running The App From sermonindex.net

A step by step guide how to install this app

```
* Visit the sermonindex.net and go to Download section.
* Choose the Operating System you want to download the installer for and click on download
* Based on your operating system follow below steps further
```

### Running App From Source

#### For Windows/Linux/MacOS

Please have node.js installed from https://nodejs.dev/ or your local package repo
````
git clone https://github.com/VincentXE/SermonIndex-GUI
cd SermonIndex-GUI
npm install
npm start
````

## Building the app

### For Windows
````
npx electron-packager .
npm run package-win
````

If you want to make an installer, please use the included .nsi script. 
### For MacOS

````
npm run package-mac
npm run create-mac-installer
````

### For Linux 
!! If running debian, please put `electron-installer-debian": "^3.0.0"` as a dependency in package.json
````
npm run package-linux
````
If wanting to make debian installer:
```
npm run create-debian-installer
```

## Built With

#### Basic framework 
* [node](http://www.dropwizard.io/1.0.2/docs/) - powers the backend
* [electron](https://maven.apache.org/) - powers the gui

#### Dependencies
* [needle](https://rometools.github.io/rome/) - to integrate sermonindex web APIs
* [download](https://rometools.github.io/rome/) - to download the media files
* [electron-log](https://rometools.github.io/rome/) - to create application logs
* [electron-packager](https://rometools.github.io/rome/) - to package the app
* [electron-installer-dmg](https://rometools.github.io/rome/) - to create installer for MacOS
* [jquery](https://rometools.github.io/rome/) - to perform DOM operations

## Contributing
> Under construction

## Authors

* **Sherebiah Tishbi** for initial code

## License

This project is licensed under the ISC License. 

## Acknowledgments

* Bro. Greg Gordon for constant support in testing and constant encouragement.
* Bro. Llewellynvdm for APIs.
* Yarusha Tishbi - my beloved wife for providing all moral support and bearing with me while I do not listen to her calls for breakfast/lunch/dinner! :blush:
* Krupa Tishbi - my beloved daughter for helping me with mathematical operations, obviously I dont know how to calculate the percentage. :blush:
