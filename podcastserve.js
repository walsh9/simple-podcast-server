var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var jade = require('jade');
var fs = Promise.promisifyAll(require("fs"));
var id3 = require('id3js');
var path = require('path');
var id3Async = Promise.promisify(id3);
var naturalSort = require('./local_modules/naturalSort');

// load configFile
var config = require('./config');

var PodcastServer = function () {

    var defaults = {
        "serverName" : "localhost",
        "port" : "3000",
        "documentRoot" : "public",
        "mediaExtensions" : [".mp3",".m4a",".mp4"]
    };
    var options = {}
    Object.keys(defaults).forEach(function (property) {
        options[property] = config[property] || defaults[property];
    });
    var app = express();
    var serverUrl = "http://" + options.serverName + ":" + options.port + "/"; 
    var isMediaFile = function (filename) {
        return _.contains(options.mediaExtensions, path.extname(filename));
    };
    var getSubDirs = function (root) {
        return fs.readdirAsync(root)
            .map(function getPath(fileName) {
                return path.join(root, fileName);
            })
            .filter(function(filePath) {
                return fs.statAsync(filePath).then(function(stat) {
                    stat.filePath = filePath;
                    return stat.isDirectory();
                });
            })
            .map(function(x) {
                return path.basename(x);
            });
    };
    var getId3 = function (fileName) {
        var file = {};
        file.name = path.basename(fileName);
        // if (path.extname(fileName) == ".mp3") {
        //     file.tags = id3Async({"file": fileName, "type": id3.OPEN_LOCAL});
        // }
        return file;
    };
    var getFiles = function (folder) {
        var fileSet = {
            "folderName": folder
        };
        return fs.readdirAsync(folder)
            .filter(isMediaFile)
            .map(function(x) {
                return path.join(folder, x);
            })
            .map(getId3)
            .then(
                function(files) {
                    fileSet.files = files;
                    return fileSet;
                }
            );
    };
    var createFeedObject = function (fileSet) {
        var dirName = fileSet.folderName;
        var feedTitle = dirName.split(path.sep)[1];
        var feedOptions = {
            title: feedTitle,
            description: feedTitle,
            feed_url: serverUrl + ['feeds', 'xml', feedTitle].map(encodeURIComponent).join('/')
        };
        var feed = new Podcast(feedOptions);
        fileSet.files.sort(function (a, b) {
            return naturalSort(b.name, a.name);
        });
        for (var i = 0, len = fileSet.files.length; i < len; i++) {
            var baseFileName = fileSet.files[i].name;
            var fileName = path.join(dirName, baseFileName);
            var cleanName = path.basename(baseFileName, path.extname(fileName));
            var itemOptions = {
                title: cleanName,
                description: cleanName,
                url: serverUrl + ['feeds', feedTitle, cleanName].map(encodeURIComponent).join('/'),
                date: Date.now(),
                enclosure: {
                    url: serverUrl + ['media', feedTitle, baseFileName].map(encodeURIComponent).join('/'),
                    file: fileName
                }
            };
            feed.item(itemOptions);
        }
        console.log("Creating feed for " + dirName);
        //console.log(feed);
        return {"name": feed.title,
                "feed": feed,
                "xml" : feed.xml()
               };
    };
    getIndex = function(req, res, next) {
        getSubDirs(options.documentRoot)
        .then(function renderIndexTemplate (dirs) {
            res.render('index', {"feeds": dirs});
        })
    };
    getFeed = function(req, res, next) {
        var name = req.params.name;
        var folder = path.join(options.documentRoot, name);
        getFiles(folder)
            .then(createFeedObject)
            .then(function renderFeedTemplate (feedObject) {
                res.render('feed', {"feed": feedObject.feed});
            })
            .catch(function(e) {
                res.status(404).send('Couldn\'t find feed: ' + name);
            });
    };
    getFeedXml = function(req, res, next) {
        var name = req.params.name;
        var folder = path.join(options.documentRoot, name);
        getFiles(folder)
            .then(createFeedObject)
            .then(function renderFeedXml (feedObject) {
                res.send(new Buffer(feedObject.xml));
            })
            .catch(function(e) {
                res.status(404).send('Couldn\'t find feed: ' + name);
            });
    };

    app.set('view engine', 'jade');
    app.use('/media', express.static(path.join(__dirname, options.documentRoot)));
    app.use('/lib', express.static(path.join(__dirname, 'lib')));
    app.use('/css', express.static(path.join(__dirname, 'css')));
    app.use('/js', express.static(path.join(__dirname, 'js')));
    app.use('/feeds/xml/:name', getFeedXml);
    app.use('/feeds/:name', getFeed);
    app.use('/', getIndex);    
    app.listen(options.port);
    console.log ("Listening at " + serverUrl + " ...");
}();
