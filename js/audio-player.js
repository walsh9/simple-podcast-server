(function () {
    'use strict';
    var skipBackInterval = 10;
    var skipAheadInterval = 30;
    var player = document.querySelector('.player audio');
    player.title = 'Nothing';
    var source = document.querySelector('.player audio source');
    var playerContainer = document.querySelector('.player');
    var playButton = document.querySelector('.player .player-play');
    var skipBackButton = document.querySelector('.player .player-skip-back');
    var skipAheadButton = document.querySelector('.player .player-skip-ahead');
    var infoTitle = document.querySelector('.player .player-title');
    var infoTime = document.querySelector('.player .player-time');
    var secondsToTime = function (timeInSeconds) {
        var hour = Math.floor(timeInSeconds / 3600);
        var min = Math.floor(timeInSeconds % 3600 / 60);
        var sec = Math.floor(timeInSeconds % 60);
        sec = (sec < 10) ? '0' + sec : sec;
        min = (hour > 0 && min < 10) ? '0' + min : min;
        if (hour > 0) {
            return hour + ':' + min + ':' + sec;
        }
        return min + ':' + sec;
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
        if (player.paused) {
            play();
        } else {
            pause();
        };
        updateView();
    };
    var load = function (url, title) {
        if (source.src !== url) {
            source.src = url;
            player.title = title;
            player.load();
            updateView();
        } else {
            toggle();
        }
    };
    var playItem = function () {
        if (!this.parentElement.classList.contains('is-playing')) {
            var items = this.parentElement.parentElement.children
            var i, item;
            for(i = 0; i < items.length; i++) {
                var item = items[i];
                var button = item.querySelector('.btn');
                item.classList.remove('is-playing');
                button.classList.remove('octicon-playback-pause');
                button.classList.add('octicon-playback-play');
            }
            this.parentElement.classList.add('is-playing');
            var url = this.getAttribute('data-url');
            var title = this.parentElement.textContent;
            load(url, title);
            play();
        } else {
            toggle();
        }
    };
    var updateView = function () {
        if (player.duration && playerContainer.classList.contains('is-hidden')) {
            playerContainer.classList.remove('is-hidden');
        }
        infoTitle.textContent = player.title;
        if (player.duration) {
            infoTime.textContent = secondsToTime(player.currentTime) + ' / ' + secondsToTime(player.duration);
        } else {
            infoTime.textContent = '';
        }
        var currentListButton = document.querySelector('.itemlist .is-playing .btn')
        if (player.paused) {
            playButton.classList.remove('octicon-playback-pause');
            playButton.classList.add('octicon-playback-play');
            currentListButton.classList.remove('octicon-playback-pause');
            currentListButton.classList.add('octicon-playback-play');
        } else {
            playButton.classList.remove('octicon-playback-play');
            playButton.classList.add('octicon-playback-pause');
            currentListButton.classList.remove('octicon-playback-play');
            currentListButton.classList.add('octicon-playback-pause');
        };
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
    player.addEventListener('timeupdate', updateView, true);
    attachButtons();
    updateView();
}())