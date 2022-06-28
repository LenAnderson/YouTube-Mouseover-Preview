export const debounce = (func, delay)=>{
	let to;
	return (...args) => {
		if (to) clearTimeout(to);
		to = setTimeout(()=>func.apply(this, args), delay);
	};
}