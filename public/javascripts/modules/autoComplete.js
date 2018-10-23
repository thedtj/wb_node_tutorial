function autoComplete(input, latInput, lngInput) {
	if (!input) return; // skip this function if there is no input
	const dropdown = new google.maps.places.Autocomplete(input);

	dropdown.addListener('place_changed', () => {
		const place = dropdown.getPlace();
		latInput.value = place.geometry.location.lat();
		lngInput.value = place.geometry.location.lng();
	});
	//prevent form submit when address field is entered
	input.on('keydown', (e) => {
		if (e.keyCode === 13) e.preventDefault();
	});
}

export default autoComplete;
