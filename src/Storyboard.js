import { StoryboardFrame } from "./StoryboardFrame.js";
import { StoryboardSheet } from "./StoryboardSheet.js";

export class Storyboard {
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