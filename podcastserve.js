var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var fs = Promise.promisifyAll(require("fs"));
var path = require('path');
var id3 = require('id3js');

var PodcastServer = function() {

    var wwwPath = "www";
    var mediaExtensions = [".mp3"];
    var podcastData = {};


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
                path.join(root, x)
            })
    }

    function getFiles(folder) {
        var fileSet = {
            "folderName": folder
        }
        return fs.readdirAsync(folder)
            .filter(isMediaFile)
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
        console.log("Creating feed for " + dirName);
        var feedOptions = {
            title: feedTitle,
            description: feedTitle,
            feed_url: dirName + ".xml"
        };
        var feed = new Podcast(feedOptions);
        for (var i = 0, len = fileSet.files.length; i < len; i++) {
            var baseFileName = fileSet.files[i];
            var fileName = path.join(dirName, baseFileName);
            console.log("Creating items for " + fileName);
            var itemOptions = {
                title: fileName,
                description: path.basename(fileName),
                url: path.join(dirName, path.basename(fileName, path.extname(fileName))) + ".xml",
                date: Date.now(),
                enclosure: {
                    url: path.join(path.basename(dirName, path.extname(fileName))) + ".xml",
                    file: fileName
                }
            }
            feed.item(itemOptions);
            var xml = feed.xml();
            fs.writeFile(feedTitle + ".xml", xml);
        }
    }

    getSubDirs(wwwPath)
        .map(getFiles)
        .map(createFeed);

}();
