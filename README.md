<img src="https://raw.githubusercontent.com/sermonindex/sermondownloader2.0/master/_app-image.jpg">

My personal fork of sermonindex downloader 2.0. Please feel free to take contributions from this repo and integrate it in the main repo.

# SermonIndex-GUI

This project is developed to provide the easy app based navigation for all sermons available on <a href="https://www.sermonindex.net">sermonindex</a>. The goal is to aid users to cate local copy of sermons by downloading them. User has choice to download single or all sermons of a desired speaker. This app is cross platform and should work seamlessly on Windows, MAcOS and Linux (debian) without any issues.

## Getting Started



### Running The App From sermonindex.net

A step by step guide how to install this app

```
* Visit the sermonindex.net and go to Download section.
* Choose the Operating System you want to download the installer for and click on download
* Based on your operating system follow below steps further
```

### Running App From Source

#### For Windows

Please have node.js installed from https://nodejs.dev/
````
git clone https://github.com/VincentXE/SermonIndex-GUI
cd SermonIndex-GUI
npm install
npm start
````
#### For MacOS
> Under construction
#### For Linux (Debian)
> Under construction

## Building the app

### For Windows
````
npx electron-packager .
npm run package-win
````
### For MacOS
> Under construction

### For Linux 
> Under construction

#### Ubuntu/Debian based
> Under construction

#### Others
> Under construction

## Built With

#### Basic framework 
* [node 12.1.0](http://www.dropwizard.io/1.0.2/docs/) - powers the backend
* [electron 11.5.0](https://maven.apache.org/) - powers the gui

#### Dependencies
* [needle 2.4.1](https://rometools.github.io/rome/) - to integrate sermonindex web APIs
* [download 8.0.0](https://rometools.github.io/rome/) - to download the media files
* [electron-log 4.1.2](https://rometools.github.io/rome/) - to create application logs
* [electron-packager 14.2.1](https://rometools.github.io/rome/) - to package the app
* [electron-installer-dmg 3.0.0](https://rometools.github.io/rome/) - to create installer for MacOS
* [jquery 3.5.0](https://rometools.github.io/rome/) - to perform DOM operations

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
