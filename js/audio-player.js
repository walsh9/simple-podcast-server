(function () {
    'use strict';
    var player = document.querySelector('.player audio');
    var source = document.querySelector('.player audio source');
    var paused = function() {
        return player.paused;
    }
    var playButton = document.querySelector('.player .play');
    var play = function () {
        player.play();
    }
    var pause = function () {
        player.pause();
    }
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
    };
    attachButtons();
}())