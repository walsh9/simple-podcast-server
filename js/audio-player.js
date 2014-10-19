(function () {
    'use strict';
    var skipBackInterval = 10;
    var skipAheadInterval = 30;
    var player = document.querySelector('.player audio');
    var source = document.querySelector('.player audio source');
    var playButton = document.querySelector('.player .play');
    var skipBackButton = document.querySelector('.player .skip-back');
    var skipAheadButton = document.querySelector('.player .skip-ahead');
    var paused = function() {
        return player.paused;
    };    
    var play = function () {
        player.play();
    };
    var pause = function () {
        player.pause();
    };
    var within = function (min, value, max) {
        return parseInt(Math.min(Math.max(min, value), max));
    };
    var skip = function(skipTime) {
        if (player.duration) {
            var min = 0;
            var newTime = player.currentTime + skipTime || 0;
            var max = player.duration || 0;
            player.currentTime = within(min, newTime, max);
        };
    };
    var skipBack = function () {
        skip(-skipBackInterval);
    };
    var skipAhead = function () {
        skip(skipAheadInterval);
    };
    var toggle = function () {
        if (paused()) {
            playButton.classList.remove('octicon-playback-play');
            playButton.classList.add('octicon-playback-pause');
            play();
        } else {
            playButton.classList.remove('octicon-playback-pause');
            playButton.classList.add('octicon-playback-play');
            pause();            
        };
    };
    var load = function (url) {
        source.src = url;
        player.load();
    };
    var playItem = function() {
        var url = this.getAttribute('data-url');
        load(url);
        play();
    };
    var attachButtons = function () {
        var items = document.querySelectorAll('.item-play-button');
        var i, item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            item.addEventListener('click', playItem, true);
        }
        playButton.addEventListener('click', toggle, true);
        skipBackButton.addEventListener('click', skipBack, true);
        skipAheadButton.addEventListener('click', skipAhead, true);        
    };
    attachButtons();
}())