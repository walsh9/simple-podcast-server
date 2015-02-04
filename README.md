# simple-podcast-server
Drop in some folders of media files.  Browse, listen, and suscribe to the auto-generated feeds. A work in progress.

### Installation
Put the project in it's own folder.

Install dependencies with npm:

    npm install

### Configuration
Put some folders in your document root.

    |--podcastserve.js
    '--public/
        |--Podcast 1/
        |   |--Episode 1.mp3
        |   '--Episode 2.mp3
        '--Podcast 2/
            |--Ep 1.mp3
            '--Ep 2.mp3

### Run
`node podcastserve.js`

If you haven't changed the config you can check it out at http://localhost:3000

###Configuration
copy `config.example.js` to `config.js`. Then edit `config.js` to fit your setup.

**Some setup options:**

Option | Description
---|---
`config.serverName` | Domain name or IP address of the server.
`config.port` | Port to listen on.
`config.documentRoot` | Path to the folder that will contain the media folders. e.g. `public`, `media`, `podcasts`

### Screenshots
![Example](https://cloud.githubusercontent.com/assets/6074785/6036398/9531ef9a-ac12-11e4-9732-eb5aca56ed5c.png)

![Example](https://cloud.githubusercontent.com/assets/6074785/6036405/9f93173e-ac12-11e4-9345-daaa6fc5a4e0.png)

![Example](https://cloud.githubusercontent.com/assets/6074785/6036409/a1492d3e-ac12-11e4-96c3-19466ac900ce.png)

### Other stuff
 - You can add images to the folders to be used as thumbnails.
 - If the file names contain dates, you can sort the files by those dates (Default is file create date.)

Details in the example config file.

### To Do
 - Allow more flexible folder structures.
 - Default thumbnail file.
 - Buttons for speed control on HTML5 audio player.
 - Clean up video player.
 - Allow definition/overrides of metadata (descriptions, etc.) with folder/file level config files (?)

### License
MIT

