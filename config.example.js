var config = {};

config.serverName = 'localhost';
config.port = '3000';
config.serverRootUrl = '';  // On production server, we can specify the server root URL directly in case it is behind nginX or mapping to sub foler or etc.
config.documentRoot = 'public';
config.mediaExtensions = ['.mp3', '.m4a', '.mp4'];
config.coverArtFiles = ['folder.png', 'folder.jpg'];
config.useFilenameDates = true;
// Uses moment.js
// http://momentjs.com/docs/#/parsing/string-format/
config.datePatterns = [
  { matcher: /\[(\d{6})\]/, format: 'YYMMDD' },
  { matcher: /\[(\d{8})\]/, format: 'YYYYMMDD' }];

module.exports = config;