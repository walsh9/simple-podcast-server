var Podcast = require("podcast");
var Promise = require("bluebird");
var _ = require("lodash");
var express = require("express");
var jade = require('jade');
var fs = Promise.promisifyAll(require("fs"));
var id3 = require('id3js');
var path = require('path');
var id3Async = Promise.promisify(id3);
var crypto = require('crypto');
var naturalSort = require('./local_modules/naturalSort');
var md5 = require('crypto-js/md5');
var enc_hex = require('crypto-js/enc-hex');

// load configFile
var config = require('./config');

var PodcastServer = function () {

    var defaults = {
        "serverName" : "localhost",
        "port" : "3000",
        "documentRoot" : "public",
        "mediaExtensions" : [".mp3",".m4a",".mp4"],
        "coverArtFiles" : ["folder.png", "folder.jpg"],
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
    var isCoverArt = function (filename) {
        return _.contains(options.coverArtFiles.map(function (covername) {
                return covername.toUpperCase()
            }), filename.toUpperCase());
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
    var getFeedCoverArt = function (folder) {
        return fs.readdirAsync(folder)
        .filter(isCoverArt)
    }
    var setFeedCoverArt = function (feedObject) {
        var folder = feedObject.folder
        return getFeedCoverArt(folder)
        .then(function (filenames) {
            if (filenames.length > 0) {
                feedObject.feed.itunesImage = 
                feedObject.feed.image_url = serverUrl + ['media', feedObject.feed.title, filenames[0]].join('/');
            }  
            return feedObject;
        });
    }
    // var getId3 = function (fileName) {
    //     var file = {};
    //     file.name = path.basename(fileName);
    //     if (path.extname(fileName) == ".mp3") {
    //         file.tags = id3Async({"file": fileName, "type": id3.OPEN_LOCAL});
    //     }
    //     return file;
    // };
    var getStats = function(fileName) {
        var file = {};
        file.name = path.basename(fileName);
        return fs.statAsync(fileName)
        .then(function (stats) {
            file.size = stats.size;
            file.ctime = Date.parse(stats.ctime);
            file.mtime = Date.parse(stats.mtime);
            return file;
        });
    }
    var getFiles = function (folder) {
        var fileSet = {
            "folderName": folder
        };
        return fs.readdirAsync(folder)
            .filter(isMediaFile)
            .map(function(x) {
                return path.join(folder, x);
            })
            .map(getStats)
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
        var pubDate = new Date();
        var stub = 'f' + generateStub(feedTitle);
        pubDate.setTime(Math.max.apply(undefined, fileSet.files.map(function(file) {
            return file.ctime;
        })));
        var feedOptions = {
            title: feedTitle,
            description: feedTitle,
            pubDate: pubDate,
            feed_url: serverUrl + ['feeds', 'xml', stub].map(encodeURIComponent).join('/'),
            generator: "Simple Podcast Server",
            site_url: serverUrl,
        };
        var feed = new Podcast(feedOptions);
        fileSet.files.sort(function (a, b) {
            return naturalSort(b.name, a.name);
        });
        for (var i = 0, len = fileSet.files.length; i < len; i++) {
            var baseFileName = fileSet.files[i].name;
            var fileName = path.join(dirName, baseFileName);
            var cleanName = path.basename(baseFileName, path.extname(fileName));
            var createDate = new Date();
            createDate.setTime(fileSet.files[i].ctime);
            var itemOptions = {
                title: cleanName,
                description: cleanName,
                url: serverUrl + ['feeds', stub, cleanName].map(encodeURIComponent).join('/'),
                date: createDate,
                guid: 'm' + generateStub(cleanName, 12),
                enclosure: {
                    url: serverUrl + ['media', feedTitle, baseFileName].map(encodeURIComponent).join('/'),
                    file: fileName
                }
            };
            var item = feed.item(itemOptions);
        };
        console.log("Creating feed for " + dirName);
        return {"name"  : feed.title,
                "folder": path.join(options.documentRoot, feedTitle),
                "feed"  : feed,
                "xml"   : feed.xml()
               };
    };
    var generateStub = function (s, len) {
        var length = len || 8;
        return md5(s)
        .toString(enc_hex)
        .slice(0, length);
    }
    var packageStub = function (dir) {
        var feed = {}
        feed.title = dir;
        feed.stub = 'f' + generateStub(dir);
        return feed;
    };
    var getIndex = function(req, res, next) {
        getSubDirs(options.documentRoot)
        .map(packageStub)
        .map(function (feed) {
            var folder = path.join(options.documentRoot, feed.title);
            return getFeedCoverArt(folder)
                .then(function (covers) {
                    if (covers.length > 0) {
                        feed.image = ['media', feed.title, covers[0]].join('/');
                    };
                    return feed;
                })
        })
        .then(function renderIndexTemplate (feeds) {
            res.render('index', {"feeds": feeds});
        })
    };
    var getFeedPath = function (path) {
        var titleSearch, stubSearch;
        return getSubDirs(options.documentRoot)
        .map(packageStub)
        .then(function renderIndexTemplate (feeds) { 
            titleSearch = _.where(feeds, {'title': path})
            if (titleSearch.length > 0) {
                return titleSearch[0].title
            }
            stubSearch = _.where(feeds, {'stub': path})
            if (stubSearch.length > 0) {
                return stubSearch[0].title
            }
            return '404';
        });
    }
    var getFeed = function(req, res, next) {
        getFeedPath(req.params.name)
            .then(function (name) {
                return path.join(options.documentRoot, name);
            })
            .then(getFiles)
            .then(createFeedObject)
            .then(setFeedCoverArt)
            .then(function renderFeedTemplate (feedObject) {
                //console.log(feedObject);
                res.render('feed', {"feed": feedObject.feed});
            })
            .catch(function(e) {
                console.log(e);
                res.status(404).send('Couldn\'t find feed: ' + req.params.name);
            });
    };
    var getFeedXml = function(req, res, next) {
        getFeedPath(req.params.name)
            .then(function (name) {
                return path.join(options.documentRoot, name);
            })
            .then(getFiles)
            .then(createFeedObject)
            .then(setFeedCoverArt)
            .then(function renderFeedXml (feedObject) {
                res.send(new Buffer(feedObject.xml));
            })
            .catch(function(e) {
                res.status(404).send('Couldn\'t find feed: ' + req.params.name);
            });
    };

    app.set('view engine', 'jade');
    app.use('/media', express.static(path.join(__dirname, options.documentRoot), {
        setHeaders: function(res, path) {
            res.attachment();
        }
    }));
    app.use('/lib', express.static(path.join(__dirname, 'lib')));
    app.use('/css', express.static(path.join(__dirname, 'css')));
    app.use('/js', express.static(path.join(__dirname, 'js')));
    app.use('/feeds/xml/:name', getFeedXml);
    app.use('/feeds/:name', getFeed);
    app.use('/', getIndex);    
    app.listen(options.port);
    console.log ("Listening at " + serverUrl + " ...");
}();
