var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var jade = require('jade');
var fs = Promise.promisifyAll(require("fs"));
var id3 = require('id3js');
var path = require('path');
var id3Async = Promise.promisify(id3);
var PodcastServer = function () {

    var defaults = {
        "serverName" : "localhost",
        "port" : "3000",
        "documentRoot" : "public",
        "mediaExtensions" : [".mp3"]
    };
    var options = defaults;
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
            }).each(function(x) {
                return path.join(root, x);
            });
    };
    var getId3 = function (fileName) {
        var file = {};
        file.name = path.basename(fileName);
        if (path.extname(fileName) == ".mp3") {
            file.tags = id3Async({"file": fileName, "type": id3.OPEN_LOCAL});
        }
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
            feed_url: serverUrl + ['feeds', feedTitle + ".xml"].map(encodeURIComponent).join('/')
        };
        var feed = new Podcast(feedOptions);
        for (var i = 0, len = fileSet.files.length; i < len; i++) {
            var baseFileName = fileSet.files[i].name;
            var fileName = path.join(dirName, baseFileName);
            var cleanName = path.basename(baseFileName, path.extname(fileName));
            var itemOptions = {
                title: cleanName,
                description: cleanName,
                url: serverUrl + ['feeds', feedTitle, cleanName + ".html"].map(encodeURIComponent).join('/'),
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
    var escapeRegExp = function (value) {
      return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    };
    var routeXML = function (route, xml) {
        console.log('Creating Route for ' + route);
        app.get(route, function(req, res) {
            res.set('Content-Type', 'text/xml');
            res.send(new Buffer(xml));
        });
    };
    var routeView = function(route, template, locals) {
      console.log('Creating Route for ' + route);
      app.get(route, function(req, res) {
        res.render(template, locals);
      });
    };
    var routeFeeds = function (feedObjects) {
        var i = 0, 
            length = feedObjects.length,
            router = express.Router();
        for (; i < length; i++) {
            routeXML('/feeds/' + escapeRegExp(encodeURIComponent(feedObjects[i].name)) + ".xml", feedObjects[i].xml);
        }
        return feedObjects;
    };
    var routeTemplates = function (feedObjects) {
        routeView('/', 'index', {"feeds": feedObjects});
        for (var i = 0; i < feedObjects.length; i++) {
            routeView('/feeds/' + escapeRegExp(encodeURIComponent(feedObjects[i].feed.title)) + '.html', 
                'feed', 
                {"feed": feedObjects[i].feed});
        }
        return feedObjects;
    };
    app.use('/media', express.static(path.join(__dirname, options.documentRoot)));
    app.set('view engine', 'jade');
    app.listen(options.port);
    console.log ("Listening at " + serverUrl + " ...");
    getSubDirs(options.documentRoot)
        .map(getFiles)
        .map(createFeedObject)
        .then(routeFeeds)
        .then(routeTemplates);
}();
