// ==UserScript==
// @name         YouTube - Mouseover Preview
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      1.6
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function init() {
        initOn(document);
        var mo = new MutationObserver(function(muts) {
            muts.forEach(function(mut) {
                [].forEach.call(mut.addedNodes, function(node) {
                    if (node instanceof HTMLElement) {
                        initOn(node);
                    }
                });
            });
        });
        mo.observe(document.body, {childList: true, subtree: true});
    }
    function initOn(base) {
        [].forEach.call(base.querySelectorAll('ytd-thumbnail a[href^="/watch"]'), function(link) {
            link.parentNode.addEventListener('mouseover', function() {
                if (link.spinner) {
                    link.spinner.style.opacity = 1;
                }
                if (link.storyboard) return;
                var spinner = document.createElement('div');
                spinner.style.position = 'absolute';
                spinner.style.top = '0';
                spinner.style.right = '0';
                spinner.style.bottom = '0';
                spinner.style.left = '0';
                spinner.style.background = 'rgba(255,255,255,0.5)';
                spinner.style.fontSize = '14px';
                spinner.style.textAlign = 'center';
                spinner.style.lineHeight = '2';
                spinner.style.color = 'rgb(0,0,0)';
                spinner.style.fontWeight = 'bold';
                spinner.textContent = 'Loading Storyboard...';
                var container = link.querySelector('yt-img-shadow');
                container.appendChild(spinner);
                link.querySelector('#mouseover-overlay').style.display = 'none';
                loadStoryboard(link).then(function(imgs) {
                    if (imgs === false) {
                        spinner.textContent = 'No Storyboard :(';
                        link.spinner = spinner;
                        setTimeout(function() {
                            spinner.style.opacity = 0;
                            link.querySelector('#mouseover-overlay').style.display = '';
                        }, 2000);
                        return;
                    }
                    var frame = document.createElement('img');
                    link.frame = frame;
                    frame.src = imgs[0].src;
                    frame.style.position = 'absolute';
                    container.appendChild(frame);
                    container.removeChild(spinner);
                });
            });
            link.parentNode.addEventListener('mousemove', function(evt) {
                if (!link.storyboard || link.spinner) return;
                link.storyboard.then(function(imgs) {
                    if (imgs !== false) {
                        showFrame(link.querySelector('yt-img-shadow'), evt.clientX, link.frame, imgs);
                    }
                });
            });
            link.parentNode.addEventListener('mouseout', function(evt) {
                var el = evt.toElement;
                while (el && el != link && el.parentElement) {
                    el = el.parentElement;
                }
                if (el == link) return;
                if (link.spinner) {
                    link.spinner.style.opacity = 0;
                    return;
                }
                hideFrame(link.frame);
            });
            link.addEventListener('click', function(evt) {
                if (evt.shiftKey && link.frame.time && link.duration) {
                    evt.preventDefault();
                    location.href = link.href + '#t=' + Math.round(link.frame.time*link.duration);
                }
            });
            var durIv = setInterval(()=>{
                getDuration(link);
                if (link.duration) {
                    clearInterval(durIv);
                }
            }, 100);
        });
    }

    function getDuration(link) {
        if (link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > .ytd-thumbnail-overlay-time-status-renderer')) {
            var duration = 0;
            var durations = link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > .ytd-thumbnail-overlay-time-status-renderer').textContent.trim().split(':');
            for (var i=0;i<durations.length;i++) {
                duration += durations[durations.length-1-i]*Math.pow(60,i);
            }
            link.duration = duration;
        }
    }

    function showFrame(container, x, frame, imgs) {
        var totalFrames = 0;
        imgs.forEach(function(it) {
            it.frames = it.height / 90 * 5;
            totalFrames += it.frames;
        });
        x = x - container.getBoundingClientRect().left;
        frame.time = x / container.offsetWidth;
        var frameIdx = Math.round(x / (container.offsetWidth / totalFrames));
        var lastFrame = -1;
        var i = -1;
        var rows = 0;
        while (i+1 < imgs.length && lastFrame < frameIdx) {
            rows = (lastFrame+1) / 5;
            lastFrame += imgs[++i].frames;
        }
        var w = imgs[i].width / 5;
        var iw;
        var ih;
        var fw;
        var fh;
        if (container.offsetWidth / container.offsetHeight > w / 90) {
            iw = Math.round(container.offsetWidth / w * imgs[i].width);
            ih = Math.round(container.offsetWidth / w * imgs[i].height);
            fw = container.offsetWidth;
            fh = Math.round(container.offsetWidth / w * 90);
        } else {
            iw = Math.round(container.offsetHeight / 90 * imgs[i].width);
            ih = Math.round(container.offsetHeight / 90 * imgs[i].height);
            fw = Math.round(container.offsetHeight / 90 * w);
            fh = container.offsetHeight;
        }
        frame.src = imgs[i].src;
        frame.style.width = iw + 'px';
        var row = Math.floor(frameIdx / 5) - rows;
        var col = frameIdx % 5;
        frame.style.top = -fh * row + 'px';
        frame.style.left = -fw * col + 'px';
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
                var spec = reg.exec(xhr.responseText);
                if (!spec) {
                    resolve(false);
                    return;
                }
                spec = spec[1];
                reg = /(http.*?)\|.*?#M\$M#(.*?)\|(\d+)#(\d+)#(\d+)#(\d+)#(\d+)#\d+#M\$M#(.*?)$/g;
                spec = reg.exec(spec);
                if (!spec) {
                    resolve(false);
                    return;
                }
                var http = spec[1].replace(/\\/g, '').replace('$L', '2');
                var frameW = spec[3]*1;
                var frameH = spec[4]*1;
                var frameCount = spec[5]*1;
                var frameRowLength = spec[6]*1;
                var frameRowCount = spec[7]*1;
                var sigh = spec[8];
                http += '?sigh='+sigh;
                reg = /"length_seconds":\s*"(\d+)"/;
                var length = reg.exec(xhr.responseText)[1];
                var imgs = [];
                var promises = [];
                for (var i=0;i<Math.ceil(frameCount / frameRowLength / frameRowCount);i++)(function(i) {
                    promises.push(new Promise(function(resolve, reject) {
                        var img = new Image();
                        imgs[i] = img;
                        img.addEventListener('error', function() {
                            console.warn(404, img.src);
                            imgs[i] = undefined;
                            resolve();
                        });
                        img.addEventListener('load', function() {
                            resolve();
                        });
                        img.src = http.replace('$N', 'M'+i);
                    }));
                })(i);
                Promise.all(promises).then(function(){ resolve(imgs.filter(function(img) { return img !== undefined; })); });
            });
            xhr.send();
        });
        return link.storyboard;
    }


    init();
})();
