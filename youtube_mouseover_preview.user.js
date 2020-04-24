// ==UserScript==
// @name         YouTube - Mouseover Preview
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      1.14
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
			if (link.storyboardHref && link.storyboardHref != link.href) {
                hideFrame(link.frame);
                hideTime(link);
				link.storyboard = undefined;
				link.storyboardHref = undefined;
				link.spinner = undefined;
			}
            link.parentNode.addEventListener('mouseover', function() {
				link.storyboardHover = true;
                if (link.spinner) {
                    link.spinner.style.opacity = 1;
                }
                if (link.storyboard && link.storyboardHref == link.href) return;
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
                var overlay = link.querySelector('#mouseover-overlay');
                if (overlay) overlay.style.display = 'none';
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
					if (!link.storyboardHover) {
						hideFrame(link.frame);
						hideTime(link);
					}
                });
            });
            link.parentNode.addEventListener('mousemove', function(evt) {
                if (!link.storyboard || link.spinner) return;
                link.storyboard.then(function(imgs) {
					if (!link.storyboardHover) return;
                    if (imgs !== false) {
                        showFrame(link.querySelector('yt-img-shadow'), evt.clientX, link.frame, imgs);
                        showTime(link.frame.time*link.duration, link);
                    }
                });
            });
            link.parentNode.addEventListener('mouseout', function(evt) {
				link.storyboardHover = false;
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
                hideTime(link);
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
        if (link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > span.ytd-thumbnail-overlay-time-status-renderer')) {
            var duration = 0;
            link.durationText = link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > span.ytd-thumbnail-overlay-time-status-renderer').textContent;
            var durations = link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > span.ytd-thumbnail-overlay-time-status-renderer').textContent.trim().split(':');
            for (var i=0;i<durations.length;i++) {
                duration += durations[durations.length-1-i]*Math.pow(60,i);
            }
            link.duration = duration;
        }
    }

    function showTime(time, link) {
        let parts = [];
        let idx = 0;
        while (time > 0) {
            let ttime = Math.floor(time / 60);
            parts[idx] = Math.floor(time - ttime * 60);
            idx++;
            time = ttime;
        }
        const formatted = parts.reverse().map((it,idx)=>`${idx>0&&it<10?'0':''}${it}`).join(':');
        link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > span.ytd-thumbnail-overlay-time-status-renderer').textContent = formatted;
        return formatted;
    }
    function hideTime(link) {
        link.parentNode.querySelector('ytd-thumbnail-overlay-time-status-renderer > span.ytd-thumbnail-overlay-time-status-renderer').textContent = link.durationText;
    }

    function showFrame(container, x, frame, imgs) {
        var totalFrames = 0;
        imgs.forEach(function(it) {
            it.frames = it.height / 90 * 5;
            totalFrames += it.frames;
        });
        x = x - container.getBoundingClientRect().left;
        frame.time = x / (container.offsetWidth || 0.01);
        var frameIdx = Math.round(x / ((container.offsetWidth || 0.01) / totalFrames));
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
		if (!frame) return;
        frame.style.opacity = 0;
    }

    function loadStoryboard(link) {
        link.storyboardHref = link.href;
        link.storyboard = new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', link.href, true);
            xhr.addEventListener('load', function() {
                var reg = /playerStoryboardSpecRenderer.*?(\{.+?\})/g;
                var spec = reg.exec(xhr.responseText);
                if (!spec) {
                    resolve(false);
                    return;
                }
                spec = JSON.parse(spec[1].replace(/\\(.)/g, '$1')).spec;
                reg = /(http.*?)\|.*?#M\$M#(.*?)\|(\d+)#(\d+)#(\d+)#(\d+)#(\d+)#\d+#M\$M#([^|]*).*?$/g;
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
                http += '&sigh='+sigh;
                reg = /\\"approxDurationMs\\":\s*\\"(\d+)\\"/;
                var length = reg.exec(xhr.responseText)[1] / 1000;
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
