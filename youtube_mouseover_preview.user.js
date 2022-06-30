// ==UserScript==
// @name         YouTube - Mouseover Preview
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      2.1
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==




(function() {
    'use strict';

// ---------------- IMPORTS  ----------------



// src\basics.js
const log = (...msgs)=>console.log.call(console.log, '[YT-MOP]', ...msgs);
const error = (...msgs)=>console.error.call(console.error, '[YT-MOP]', ...msgs);

const $ = (root,query)=>(query?root:document).querySelector(query?query:root);
const $$ = (root,query)=>Array.from((query?root:document).querySelectorAll(query?query:root));

const wait = async(millis)=>(new Promise(resolve=>setTimeout(resolve,millis)));


// src\debounce.js
const debounce = (func, delay)=>{
	let to;
	return (...args) => {
		if (to) clearTimeout(to);
		to = setTimeout(()=>func.apply(this, args), delay);
	};
}


// src\Coordinate.js
class Coordinate {
	/**@type{Number}*/ row;
	/**@type{Number}*/ col;

	constructor(/**@type{Number}*/row, /**@type{Number}*/col) {
		this.row = row;
		this.col = col;
	}
}


// src\StoryboardSheet.js


class StoryboardSheet {
	/**@type{Image}*/ img;
	/**@type{Number}*/ frameCount;




	constructor(/**@type{Image}*/img) {
		this.img = img;
		this.frameCount = img.height / 90 * 5;
	}




	getFrame(/**@type{Number}*/index) {
		return new Coordinate(Math.floor(index/5), index%5);
	}
}


// src\StoryboardFrame.js



class StoryboardFrame {
	/**@type{StoryboardSheet}*/ sheet;
	/**@type{Coordinate}*/ coordinate;


	get src() {
		return this.sheet.img.src;
	}
	
	get row() {
		return this.coordinate.row;
	}
	get col() {
		return this.coordinate.col;
	}




	constructor(/**@type{StoryboardSheet}*/sheet, /**@type{Coordinate}*/coordinate) {
		this.sheet = sheet;
		this.coordinate = coordinate;
	}
}


// src\Storyboard.js



class Storyboard {
	/**@type{String}*/ url;
	/**@type{StoryboardSheet[]}*/ sheets;
	/**@type{Number}*/ frameCount = 0;
	/**@type{boolean}*/ exists = false;




	constructor(/**@type{String}*/url) {
		this.url = url;
	}




	async load() {
		try {
			const text = await (await (fetch(this.url))).text();
			let spec = (/playerStoryboardSpecRenderer.*?(\{.+?\})/g).exec(text);
			if (!spec) {
				return;
			}
			spec = JSON.parse(spec[1].replace(/\\(.)/g, '$1')).spec;
			spec = (/(http.*?)\|.*?#M\$M#(.*?)\|(\d+)#(\d+)#(\d+)#(\d+)#(\d+)#\d+#M\$M#([^|]*).*?$/g).exec(spec);
			if (!spec) {
				return;
			}

			const frameW = spec[3]*1;
			const frameH = spec[4]*1;
			const frameCount = spec[5]*1;
			const frameRowLength = spec[6]*1;
			const frameRowCount = spec[7]*1;
			const sigh = spec[8];
			const http = `${spec[1].replace(/\\/g, '').replace('$L', '2')}&sigh=${sigh}`;
			const length = (/\\?"approxDurationMs\\?":\s*\\?"(\d+)\\?"/).exec(text)[1] / 1000;
			const sheets = [];
			const promises = [];
			for (let i=0; i<Math.ceil(frameCount / frameRowLength / frameRowCount); i++)(i=>{
				promises.push(new Promise((resolve,reject)=>{
					const img = new Image();
					img.addEventListener('error', ()=>{
						sheets[i] = undefined;
						resolve();
					});
					img.addEventListener('load', ()=>{
						sheets[i] = new StoryboardSheet(img);
						resolve();
					});
					img.src = http.replace('$N', `M${i}`);
				}));
			})(i);
			await Promise.all(promises);
			this.sheets = sheets.filter(it=>it);
			this.frameCount = this.sheets.reduce((sum,cur)=>sum+cur.frameCount,0);
			this.exists = true;
		} catch {
			this.exists = false;
		}
	}




	getFrame(/**@type{Number}*/index) {
		let lastFrame = -1;
		let sheetIdx = -1;
		let rows = 0;
		while (sheetIdx+1 < this.sheets.length && lastFrame < index) {
			rows = (lastFrame + 1) / 5;
			lastFrame += this.sheets[++sheetIdx].frameCount;
		}
		const sheet = this.sheets[sheetIdx];

		return new StoryboardFrame(sheet, sheet.getFrame(index - (lastFrame - sheet.frameCount)));
	}
}


// src\HoverTarget.js



class HoverTarget {
	/**@type{HTMLElement}*/ thumb;
	/**@type{HTMLAnchorElement}*/ link;
	/**@type{String}*/ url;
	
	/**@type{HTMLElement}*/ durationElement;
	/**@type{String}*/ durationText;
	/**@type{Number}*/ duration;
	/**@type{Number}*/ hoverTime;

	/**@type{boolean}*/ isHovered = false;

	/**@type{HTMLElement}*/spinner;
	/**@type{HTMLElement}*/  spinnerText;
	
	/**@type{HTMLElement}*/  frame;

	/**@type{Storyboard}*/ storyboard;




	constructor(/**@type{HTMLElement}*/link) {
		this.thumb = link.closest('ytd-thumbnail');
		this.link = link;
		this.link.setAttribute('data-yt-mop', 1);
		this.link.addEventListener('pointerenter', (evt)=>this.enter(evt));
		this.thumb.addEventListener('pointermove', (evt)=>this.move(evt));
		this.thumb.addEventListener('pointerleave', (evt)=>this.leave(evt));
		this.link.addEventListener('click', (evt)=>{
			if (evt.shiftKey && this.hoverTime && this.duration) {
				evt.preventDefault();
				location.href = `${this.url}#t=${this.hoverTime}`;
			}
		});
	}




	async enter(/**@type{PointerEvent}*/evt) {
		log('enter', this);
		this.isHovered = true;
		if(this.link.href != this.url) {
			log('load storyboard', this)
			this.storyboard = null;
			this.url = this.link.href;
			this.hideOverlays();
			this.makeSpinner();
			await this.loadStoryboard();
			this.loadDuration();
			if (this.storyboard.exists) {
				const frame = document.createElement('img'); {
					this.frame = frame;
					this.frame.classList.add('yt-mop--frame');
					frame.style.position = 'absolute';
					frame.style.marginLeft = '0';
					frame.style.marginRight = '0';
					frame.style.maxHeight = 'none';
					frame.style.maxWidth = 'none';
					frame.style.borderRadius = 'none';
					$(this.link, 'yt-img-shadow').shadowRoot.append(frame);
					if (this.isHovered) {
						this.showFrame(0);
					} else {
						this.hideFrame();
					}
				}
				this.hideSpinner();
			} else {
				this.spinnerText.textContent = 'No Storyboard :(';
				await wait(2000);
				this.hideSpinner();
				this.showOverlays();
			}
		}
	}
	async move(/**@type{PointerEvent}*/evt) {
		this.showFrame(evt.clientX);
	}
	async leave(/**@type{PointerEvent}*/evt) {
		log('leave', this);
		this.isHovered = false;
		this.hideFrame();
	}




	async loadStoryboard() {
		this.storyboard = new Storyboard(this.url);
		await this.storyboard.load();
	}

	async loadDuration() {
		let tries = 100;
		while (tries-- > 0 && !this.durationElement) {
			this.duration = 0;
			this.durationElement = $($(this.link, 'ytd-thumbnail-overlay-time-status-renderer').shadowRoot, '#text');
			if (this.durationElement) {
				this.durationText = this.durationElement.textContent.trim();
				const durParts = this.durationText.split(':');
				durParts.forEach((part,idx)=>{
					this.duration += part * Math.pow(60, durParts.length - 1 - idx);
				});
			} else {
				await wait(100);
			}
		}
	}




	showFrame(/**@type{Number}*/clientX) {
		if (!this.storyboard || !this.storyboard.exists) return;
		const rect = this.link.getBoundingClientRect();
		const x = clientX - rect.left;
		const time = x / (rect.width || 0.01);
		this.showTime(time);
		const frameIdx = Math.max(Math.round(time * this.storyboard.frameCount), 0);
		const frame = this.storyboard.getFrame(frameIdx);
		this.frame.src = frame.src;
		this.frame.style.display = 'block';

		const w = frame.sheet.img.width / 5;
		let iw;
		let ih;
		let fw;
		let fh;
		if (rect.width / rect.height > w / 90) {
			iw = Math.round(rect.width / w * frame.sheet.img.width);
			ih = Math.round(rect.width / w * frame.sheet.img.height);
			fw = rect.width;
			fh = Math.round(rect.width / w * 90);
		} else {
			iw = Math.round(rect.height / 90 * frame.sheet.img.width);
			ih = Math.round(rect.height / 90 * frame.sheet.img.height);
			fw = math.round(rect.height / 90 * w);
			fh = rect.height;
		}
		this.frame.style.width = `${iw}px`;
		this.frame.style.top = `${-fh * frame.row}px`;
		this.frame.style.left = `${-fw * frame.col}px`;
	}
	hideFrame() {
		if (!this.frame) return;
		this.frame.style.display = 'none';
		this.hideTime();
	}

	showTime(/**@type{Number}*/time) {
		time = Math.round(time * this.duration);
		this.hoverTime = time;
		const parts = [];
		let idx = 0;
		while (time > 0) {
			const ttime = Math.floor(time / 60);
			parts[idx] = Math.floor(time - ttime * 60);
			idx++;
			time = ttime;
		}
		const formatted = parts.reverse().map((it,idx)=>`${idx>0&&it<10?'0':''}${it}`).join(':');
		this.durationElement.textContent = formatted;
	}
	hideTime() {
		this.durationElement.textContent = this.durationText;
	}




	makeSpinner() {
		const spinner = document.createElement('div'); {
			this.spinner = spinner;
			spinner.classList.add('yt-mop--spinner');
			spinner.style.position = 'absolute';
			spinner.style.top = '0';
			spinner.style.right = '0';
			spinner.style.bottom = '0';
			spinner.style.left = '0';
			spinner.style.display = 'flex';
			spinner.style.flexDirection = 'column';
			spinner.style.justifyContent = 'center';
			spinner.style.background = 'rgba(255, 255, 255, 0.5)';
			spinner.style.fontSize = '14px';
			spinner.style.textAlign = 'center';
			spinner.style.lineHeight = '2';
			spinner.style.color = 'rgb(0,0,0)';
			spinner.style.fontWeight = 'bold';
			spinner.style.zIndex = '9999';
			const text = document.createElement('div'); {
				this.spinnerText = text;
				text.classList.add('ytd-mop--spinnerText');
				text.textContent = 'Loading Storyboard...';
				spinner.append(text);
			}
			$(this.link, 'yt-img-shadow').shadowRoot.append(spinner);
		}
	}
	showSpinner() {
		this.spinner.style.display = 'flex';
		this.spinnerText = 'Loading Storyboard...';
	}
	hideSpinner() {
		this.spinner.style.display = 'none';
	}


	showOverlays() {
		$$(this.link, '#mouseover-overlay').forEach(el=>el.style.display='');
	}
	hideOverlays() {
		$$(this.link, '#mouseover-overlay').forEach(el=>el.style.display='none');
	}
}


// src\MouseoverPreview.js




class MouseoverPreview {
	/**@type{HoverTarget[]}*/ targetList = [];




	constructor() {
		this.initHoverTargets(document.body);
		const mo = new MutationObserver(muts=>{
			debounce(()=>this.initHoverTargets(document.body), 300)();
		});
        mo.observe(document.body, {childList:true, subtree:true, attributes:true});
	}




	initHoverTargets(/**@type{HTMLElement}*/root) {
		$$(root, 'ytd-thumbnail a[href^="/watch"]:not([data-yt-mop])').forEach(link=>{
			const target = new HoverTarget(link);
			this.targetList.push(target);
		});
	}
}
// ---------------- /IMPORTS ----------------




	
	window.addEventListener('error', error);
	window.addEventListener('unhandledrejection', error);




	const run = async()=>{
		log('run');
		const app = new MouseoverPreview();
	};
	run();
})();