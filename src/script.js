// ==UserScript==
// @name         YouTube - Mouseover Preview
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      2.0
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

import { log } from "./basics.js";
import { MouseoverPreview } from "./MouseoverPreview.js";

(function() {
    'use strict';




	// ${imports}




	const run = async()=>{
		log('run');
		const app = new MouseoverPreview();
	};
	run();
})();