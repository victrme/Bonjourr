function fade() {

	document.body.style.transition = "opacity .2s";

	setTimeout(function() {	
		document.body.style.opacity = 1;
	}, 150);
}

window.onload = fade;