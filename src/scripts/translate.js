var trns = document.getElementsByClassName('trn');
var local = localStorage.lang;
var dom = []



if (local && local !== "en") {

	for (var i = 0; i < trns.length; i++) {

		/*console.log(i)
		console.log(dict[trns[i].innerText])*/

		dom.push(dict[trns[i].innerText][localStorage.lang])
	}
		
	for (var i = 0; i < trns.length; i++) {
		trns[i].innerText = dom[i]
	}
}

