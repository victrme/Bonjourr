function fade() {

	setTimeout(function() {	
		document.getElementsByClassName('background')[0].style.opacity = 1;
		document.getElementsByClassName('weather')[0].style.opacity = 1;
	}, 100);
}

window.onload = fade;