var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var fs = Promise.promisifyAll(require("fs"));
var path = require('path');
var id3 = require('id3js');

var wwwPath = "www";
var mediaExtensions = [".mp3"];

function isMediaFile(filename) {
    return _.contains( mediaExtensions, path.extname(filename) )
}

function getSubDirs(root) {
    return fs.readdirAsync(root)
    .map(function getPath(fileName) { return path.join(root, fileName) })
    .filter(function (filePath) {
       return fs.statAsync(filePath).then(function(stat) {
           stat.filePath = filePath;
           return stat.isDirectory()
       })
   }).each( function(x) {path.join(root, x)} )
}


function getiles(filename) {
    return true
}


function createPodcast(fileSets) {
    for (var i = 0, len = fileSets.length; i < len; i++) {
        var fileSet = fileSets[i];
        var firstFile = fileSet[0];
        var dirName = firstFile.split(path.sep)[1]
        console.log("Creating feed for " + fileSet);
        var feedOptions = {
            title: dirName,
            description: dirName,
            feed_url: dirName + ".xml"
        };
        var feed = new Podcast(feedOptions);
        for (var j = 0, len2 = fileSet.length; j < len2; j++) {
        var fileName = fileSet[j]; 
            console.log("Creating options for " + fileName);
            var itemOptions = {
                title: path.basename(fileName),
                description: path.basename(fileName),
                url:  path.join(path.dirname(fileName) + path.basename(fileName, ".xml")) + ".xml",
                date: Date.now(),
                enclosure: {url: path.join(path.dirname(fileName) + path.basename(fileName, ".mp3")) + ".xml", file: fileName}
            }
            feed.item(itemOptions);
        };
        var xml = feed.xml();
        var dir = path.dirname(firstFile);
        fs.writeFile(dir + ".xml", xml);
    }
}


getSubDirs( wwwPath )       //read root
.map(function(filePath) { 
  return fs.readdirAsync(filePath).map(function(fileName){return path.join(filePath,fileName)}).filter( isMediaFile )
})    
.then( createPodcast )
