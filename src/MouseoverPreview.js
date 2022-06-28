import { $$, log } from "./basics.js";
import { debounce } from "./debounce.js";
import { HoverTarget } from "./HoverTarget.js";

export class MouseoverPreview {
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