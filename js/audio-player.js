(function () {
    'use strict';
    var getPlayers = function() {
        return document.querySelectorAll('audio');
    };
    var toggleClass = (el, class1, class2) {
        if el.classList.contains(class1) {
            el.classList.remove(class1);
            el.classList.add(class2);
        }
        else if el.classList.contains(class2) {
            el.classList.remove(class2);
            el.classList.add(class1);
        }
    };
    var togglePlay = function(audioEl) {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
    };
    var togglePlayByClass = function(className) {
        var players = getPlayers()
        var i, player;
        for (i = 0; i < players.length; i++) {
            player = players[i];
            if player.classList.contains(className) {
                player.play();
            } else {
                player.pause();
            }
        }
    };
}())