// ==UserScript==
// @name         YouTube - Storyboards
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      0.1
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';



    function init() {
        [].forEach.call(document.querySelectorAll('.yt-lockup-thumbnail a[href^="/watch"]'), function(link) {
            link.parentNode.addEventListener('mouseover', function() {
                console.info('over', link.href);
                if (link.storyboard) return;
                var spinner = document.createElement('div');
                spinner.style.position = 'absolute';
                spinner.style.top = '0';
                spinner.style.right = '0';
                spinner.style.bottom = '0';
                spinner.style.left = '0';
                spinner.style.background = 'rgba(255,255,255,0.5)';
                spinner.style.fontSize = '16px';
                spinner.style.textAlign = 'center';
                spinner.style.lineHeight = '7';
                spinner.style.color = 'rgb(0,0,0)';
                spinner.style.fontWeight = 'bold';
                spinner.textContent = 'Loading Storyboard...';
                var container = link.querySelector('.yt-thumb.video-thumb');
                container.appendChild(spinner);
                loadStoryboard(link).then(function(imgs) {
                    var frame = document.createElement('img');
                    link.frame = frame;
                    frame.src = imgs[0].src;
                    frame.style.position = 'absolute';
                    container.appendChild(frame);
                    container.removeChild(spinner);
                });
            });
            link.parentNode.addEventListener('mousemove', function(evt) {
                if (!link.storyboard) return;
                link.storyboard.then(function(imgs) {
                    showFrame(link.querySelector('.yt-thumb.video-thumb'), evt.clientX, link.frame, imgs);
                });
            });
            link.parentNode.addEventListener('mouseout', function(evt) {
                var el = evt.toElement;
                while (el != link && el.parentElement) {
                    el = el.parentElement;
                }
                if (el == link) return;
                console.info('out', evt.target);
                hideFrame(link.frame);
            });
        });
    }

    function showFrame(container, x, frame, imgs) {
        var totalFrames = 0;
        imgs.forEach(function(it) {
            it.frames = it.height / 45 * 10;
            totalFrames += it.frames;
        });
        x = x - container.getBoundingClientRect().left;
        var frameIdx = Math.round(x / (container.offsetWidth / totalFrames));
        var lastFrame = -1;
        var i = -1;
        var rows = 0;
        while (i+1 < imgs.length && lastFrame < frameIdx) {
            rows = (lastFrame+1) / 10;
            lastFrame += imgs[++i].frames;
        }
        frame.src = imgs[i].src;
        frame.style.height = container.offsetHeight / 45 * imgs[i].height + 'px';
        var row = Math.floor(frameIdx / 10) - rows;
        var col = frameIdx % 10;
        frame.style.top = -container.offsetHeight * row + 'px';
        frame.style.left = -container.offsetWidth * col + 'px';
        frame.style.opacity = 1;
    }
    function hideFrame(frame) {
        frame.style.opacity = 0;
    }

    function loadStoryboard(link) {
        link.storyboard = new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', link.href, true);
            xhr.addEventListener('load', function() {
                var reg = /"storyboard_spec":\s*"(.*?)"/g;
                var spec = reg.exec(xhr.responseText)[1];
                reg = /(http.*?)\|.*?#M\$M#(.*?)\|/g;
                spec = reg.exec(spec);
                var http = spec[1].replace(/\\/g, '').replace('$L', '1');
                var sigh = spec[2];
                http += '?sigh='+sigh;
                reg = /"length_seconds":\s*"(\d+)"/;
                var length = reg.exec(xhr.responseText)[1];
                var frames = length / (60 * 4);
                var imgs = [];
                var promises = [];
                for (var i=0;i<frames;i++)(function(i) {
                    promises.push(new Promise(function(resolve, reject) {
                        var img = new Image();
                        imgs[i] = img;
                        img.addEventListener('error', function() { console.info('error');
                                                                  imgs[i] = undefined;
                                                                  resolve();
                                                                 });
                        img.addEventListener('load', function() { console.info('load');
                                                                 resolve();
                                                                });
                        img.src = http.replace('$N', 'M'+i);
                    }));
                })(i);
                console.warn(promises);
                Promise.all(promises).then(function(){ resolve(imgs.filter(function(img) { return img !== undefined; })); });
            });
            xhr.send();
        });
        return link.storyboard;
    }


    init();
})();
