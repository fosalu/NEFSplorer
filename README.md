# NEFSplorer
NEFSplorer is a file explorer, file viewer and file system manager for NFC tags using the NEFS file system, all running as an Android app under Google Chrome.

## Getting started
The most up-to-date and ready-to-go version of NEFSplorer can be found here: https://fosa.lu/NEFSplorer

### How to install the app
The app can be installed by going to the link above, using Google Chrome on your Android device.\
Once you're there, touch the 3 dots to the right of your Chrome address bar and select "Install app".\
NEFSplorer will be installed on your device and should appear on your home screen shortly after.

### I run iOS or use a different browser other than Chrome
You are out of luck. NEFSplorer uses the Web NFC API, which, at the time of writing this,\
is neither supported by other browsers on Android, nor on iOS.

## Features
### Natively supported file formats
A file system can contain many different types of files in a variety of formats. While supporting every file format out there natively is close to impossible,
having to leave NEFSplorer to look at a picture that is stored on your NFC device, seemed too user-unfriendly.
This is why some of the most common file types and formats are natively supported and viewable withing the app. Here is a list of them:
* JPG (JPEG)
* PNG
* GIF
* MP3
* WAV
* OGG
* TXT

### File system operations
NEFSplorer can do all the usual file system operations, such as read, write, delete and rename files and directories.
More advance actions, such as formatting and managing an NFC device's NDEF storage and generating or renaming an NEFS file system are also supported.

### Data privacy
Due to fact that NEFSplorer runs under Google Chrome, some users might have some privacy concerns.
But rest assured, your data is yours and **ONLY** yours to keep. NEFSplorer's code runs on the client side, meaning your device!
No user or file data is transmitted back to the server.\
The code is also open-source, meaning you can check for yourself.

## Hosting your own NEFSplorer instance
You are free to use the source code and host your own instance of NEFSplorer, if you so desire.\
All you need is a webserver, that's the one and only requirement to host NEFSplorer.
