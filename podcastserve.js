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
var moment = require("moment");

// load configFile
var config = require('./config');

var PodcastServer = function () {

    var defaults = {
        "serverName" : "localhost",
        "port" : "3000",
        "documentRoot" : "public",
        "videoExtensions" : [".mp4"],
        "audioExtensions" : [".mp3",".m4a"],
        "otherExtensions" : [],
        "coverArtFiles" : ["folder.png", "folder.jpg"],
        "useFilenameDates" : false,
        "datePatterns": [], 
    };
    var options = {};
    Object.keys(defaults).forEach(function (property) {
        options[property] = config[property] || defaults[property];
    });
    var app = express();
    var serverUrl = "http://" + options.serverName + ":" + options.port + "/"; 
    var isMediaFile = function (filename) {
        var mediaExtensions = options.videoExtensions.concat(options.audioExtensions, options.otherExtensions);
        return _.contains(mediaExtensions, path.extname(filename));
    };
    var getMediaType = function (filename) {
        if (_.contains(options.videoExtensions, path.extname(filename))) {
            return 'video';
        } else if (_.contains(options.audioExtensions, path.extname(filename))) {
            return 'audio';
        } else if (_.contains(options.otherExtensions, path.extname(filename))) {
            return 'other';
        } else {
            return 'none';
        }
    };
    var isCoverArt = function (filename) {
        return _.contains(options.coverArtFiles.map(function (covername) {
                return covername.toUpperCase();
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
        .filter(isCoverArt);
    };
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
            .map(getStats)
            .then(
                function(files) {
                    fileSet.files = files;
                    return fileSet;
                }
            );
    };
    var updateTimeFromFilename = function(filename, originalTime) {
        var m, i;
        for (i = 0; i < options.datePatterns.length; i++) {
            var pattern = options.datePatterns[i];
            var matches = pattern.matcher.exec(filename);
            if (matches) {
                m = moment(matches[1], pattern.format);
                if (m.isValid()) {
                    return m.unix() * 1000;
                }
            }
        }
        return originalTime;      
    };

    var createFeedObject = function (fileSet) {
        var dirName = fileSet.folderName;
        console.log("Creating feed for " + dirName);
        var feedTitle = dirName.split(path.sep)[1];
        var pubDate = new Date();
        var hash = 'f' + generateHash(feedTitle);
        fileSet.files = fileSet.files.map(function(file) {
            file.time = file.ctime;
            if (options.useFilenameDates) {
                file.time = updateTimeFromFilename(file.name, file.ctime);
            }
            return file;
        });
        pubDate.setTime(Math.max.apply(undefined, fileSet.files.map(function(file) {
            return file.time;
        })));
        var feedOptions = {
            title: feedTitle,
            description: feedTitle,
            pubDate: pubDate,
            feed_url: serverUrl + ['feeds', 'xml', hash].map(encodeURIComponent).join('/'),
            generator: "Simple Podcast Server",
            site_url: serverUrl,
        };
        return getFeedCoverArt(fileSet.folderName)
        .then(function(covers) {
            if (covers.length > 0) {
                feedOptions.itunesImage = 
                feedOptions.image_url = serverUrl + ['media', feedTitle, covers[0]].map(encodeURIComponent).join('/');
            }  
            var feed = new Podcast(feedOptions);
            fileSet.files.sort(function (a, b) {
                return naturalSort(b.name, a.name);
            });
            for (var i = 0, len = fileSet.files.length; i < len; i++) {
                var baseFileName = fileSet.files[i].name;
                var fileName = path.join(dirName, baseFileName);
                var cleanName = path.basename(baseFileName, path.extname(fileName));
                var fileDate = new Date();
                fileDate.setTime(fileSet.files[i].time);
                var itemOptions = {
                    title: cleanName,
                    description: cleanName,
                    url: serverUrl + ['feeds', hash, cleanName].map(encodeURIComponent).join('/'),
                    date: fileDate,
                    guid: 'm' + generateHash(baseFileName, 12),
                    enclosure: {
                        url: serverUrl + ['media', feedTitle, baseFileName].map(encodeURIComponent).join('/'),
                        file: fileName
                    },
                };
                var item = feed.item(itemOptions);
                feed.items[i].mediatype = getMediaType(fileName);
            }
            feed.hash = 'f' + generateHash(feedTitle);
            return {"name"  : feed.title,
                    "folder": path.join(options.documentRoot, feedTitle),
                    "feed"  : feed,
                    "xml"   : feed.xml()
            };
        });
    };
    var generateHash = function (s, len) {
        var length = len || 8;
        return md5(s)
        .toString(enc_hex)
        .slice(0, length);
    };
    var getIndex = function(req, res, next) {
        console.log("Creating index");
        getSubDirs(options.documentRoot)
        .map(function (dir) {
            var feed = {title: dir};
            feed.hash = 'f' + generateHash(dir);
            return feed;
        })
        .map(function (feed) {
            var folder = path.join(options.documentRoot, feed.title);
            feed.link = serverUrl + ['feeds', feed.hash].map(encodeURIComponent).join('/');
            feed.feed_url = serverUrl + ['feeds', 'xml', feed.hash].map(encodeURIComponent).join('/');
            return getFeedCoverArt(folder)
                .then(function (covers) {
                    if (covers.length > 0) {
                        feed.image = serverUrl + ['media', feed.title, covers[0]].map(encodeURIComponent).join('/');
                    }
                    return feed;
                });
        })
        .then(function renderIndexTemplate (feeds) {
            res.render('index', {"feeds": feeds});
        });
    };
    var getFeedPath = function (path) {
        var titleSearch, hashSearch;
        return getSubDirs(options.documentRoot)
        .map(function (dir) {
            var feed = {title: dir};
            feed.hash = 'f' + generateHash(dir);
            return feed;
        })
        .then(function renderIndexTemplate (feeds) { 
            titleSearch = _.where(feeds, {'title': path});
            if (titleSearch.length > 0) {
                return titleSearch[0].title;
            }
            hashSearch = _.where(feeds, {'hash': path});
            if (hashSearch.length > 0) {
                return hashSearch[0].title;
            }
            return '404';
        });
    };
    var getVideoPage = function(req, res, next) {
        getFeedPath(req.params.name)
            .then(function (name) {
                return path.join(options.documentRoot, name);
            })
            .then(getFiles)
            .then(createFeedObject)
            .then(function renderVideoTemplate (feedObject) { 
                feedObject.feed.items = feedObject.feed.items.filter(function(item) {
                    return item.guid === req.params.id;
                });
                res.render('video', {"feed": feedObject.feed});
            })
            .catch(function(e) {
                res.status(404).send('Couldn\'t find video: ' + req.params.id);
                console.log(e);
                console.log(feedObject);
            });
    };
    var getFeed = function(req, res, next) {
        getFeedPath(req.params.name)
            .then(function (name) {
                return path.join(options.documentRoot, name);
            })
            .then(getFiles)
            .then(createFeedObject)
            .then(function renderFeedTemplate (feedObject) {
                res.render('feed', {"feed": feedObject.feed});
            })
            .catch(function(e) {
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
            if (isMediaFile(res.req.url)) {
                res.attachment();
            }
        }
    }));
    app.use('/lib', express.static(path.join(__dirname, 'lib')));
    app.use('/css', express.static(path.join(__dirname, 'css')));
    app.use('/js', express.static(path.join(__dirname, 'js')));
    app.use('/feeds/xml/:name', getFeedXml);
    app.use('/feeds/:name/video/:id', getVideoPage);
    app.use('/feeds/:name', getFeed);
    app.use('/', getIndex);    
    app.listen(options.port);
    console.log ("Listening at " + serverUrl + " ...");
}();
