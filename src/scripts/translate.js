
function traduction() {

	let trns = document.getElementsByClassName('trn');
	let local = localStorage.lang;
	let dom = []

	if (local && local !== "en") {

		for (let k = 0; k < trns.length; k++) {

			/*console.log(k)
			console.log(dict[trns[k].innerText])*/

			dom.push(dict[trns[k].innerText][localStorage.lang])
		}
			
		for (let i = 0; i < trns.length; i++) {
			trns[i].innerText = dom[i]
		}
	}
}

traduction()