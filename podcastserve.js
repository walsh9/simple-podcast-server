var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var fs = Promise.promisifyAll(require("fs"));
var id3 = require('id3js');
var path = require('path');
id3Async = Promise.promisify(id3);
var PodcastServer = function() {

    var app = express();
    var hostPath = "http://localhost";
    var port = "3000";
    var serverUrl = hostPath + ":" + port + "/" 
    var wwwPath = "www";
    var mediaExtensions = [".mp3"];
    var podcastData = {};

    app.use(express.static(path.join(__dirname, wwwPath)));
    app.listen(port);
    console.log ("Listening at " + serverUrl + " ...")

    function isMediaFile(filename) {
        return _.contains(mediaExtensions, path.extname(filename))
    }

    function getSubDirs(root) {
        return fs.readdirAsync(root)
            .map(function getPath(fileName) {
                return path.join(root, fileName)
            })
            .filter(function(filePath) {
                return fs.statAsync(filePath).then(function(stat) {
                    stat.filePath = filePath;
                    return stat.isDirectory()
                })
            }).each(function(x) {
                return path.join(root, x)
            })
    }

    function getId3(fileName) {
        var file = {};
        file["name"] = path.basename(fileName);
        if (path.extname(fileName) == ".mp3") {
            file["tags"] = id3Async({"file": fileName, "type": id3.OPEN_LOCAL})
        }
        return file;
    }


    function getFiles(folder) {
        var fileSet = {
            "folderName": folder
        }
        return fs.readdirAsync(folder)
            .filter(isMediaFile)
            .map(function(x) {
                return path.join(folder, x)
            })
            .map(getId3)
            .then(
                function(files) {
                    fileSet["files"] = files;
                    return fileSet;
                }
            )
    }

    function createFeed(fileSet) {
        var dirName = fileSet.folderName;
        var feedTitle = dirName.split(path.sep)[1];
        var feedOptions = {
            title: feedTitle,
            description: feedTitle,
            feed_url: serverUrl + encodeURIComponent(feedTitle) + ".xml"
        };
        var feed = new Podcast(feedOptions);
        for (var i = 0, len = fileSet.files.length; i < len; i++) {
            var baseFileName = fileSet.files[i].name;
            var fileName = path.join(dirName, baseFileName);
            var cleanName = path.basename(baseFileName, path.extname(fileName));
            var itemOptions = {
                title: cleanName,
                description: cleanName,
                url: serverUrl + encodeURIComponent(path.join(feedTitle, cleanName) + ".html"),
                date: Date.now(),
                enclosure: {
                    url: serverUrl + encodeURIComponent(path.join(feedTitle, baseFileName)),
                    file: fileName
                }
            }
            feed.item(itemOptions);
        }
        console.log("Creating feed for " + dirName);
        var xml = feed.xml();
        fs.writeFile(dirName + ".xml", xml);
    }

    getSubDirs(wwwPath)
        .map(getFiles)
        .map(createFeed);

}();
