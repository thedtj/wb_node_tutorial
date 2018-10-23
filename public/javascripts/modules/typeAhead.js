import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
	return stores
		.map((store) => {
			return `
		<a href="/store/${store.slug}" class="search__result">
		<strong>${store.name}</strong>
		<!-- <p>${store.description}</p> -->
		</a>
		`;
		})
		.join('');
}

function typeAhead(search) {
	if (!search) return;

	const searchInput = search.querySelector('input[name="search"]');
	const searchResults = search.querySelector('.search__results');

	searchInput.on('input', function() {
		// if there is no value, stop function
		if (!this.value) {
			searchResults.style.display = 'none';
			return; //stop
		}

		// show search results
		searchResults.style.display = 'block';

		axios
			.get(`/api/v1/search?q=${this.value}`)
			.then((res) => {
				if (res.data.length) {
					console.log('there is something to show.');
					// const html = searchResultsHTML(res.data);
					// searchResults.innerHTML = html;
					searchResults.innerHTML = dompurify.sanitize(
						searchResultsHTML(res.data)
					);
					return;
				}
				// alert no search results
				searchResults.innerHTML = dompurify.sanitize(
					`<div className="search__result">No Matching Results for ${
						this.value
					}</div>`
				);
			})
			.catch((err) => {
				console.error(err);
			});
	});

	// handle keyboard inputs
	searchInput.on('keyup', (e) => {
		// ignore all but up, down, and enter
		if (![38, 40, 13].includes(e.keyCode)) {
			return;
		}
		const activeClass = 'search__result--active';
		const current = search.querySelector(`.${activeClass}`);
		const items = search.querySelectorAll('.search__result');
		let next;
		if (e.keyCode === 40 && current) {
			next = current.nextElementSibling || items[0];
		} else if (e.keyCode === 40) {
			next = items[0];
		} else if (e.keyCode === 38 && current) {
			next = current.previousElementSibling || items[items.length - 1];
		} else if (e.keyCode === 38) {
			next = items[items.length - 1];
		} else if (e.keyCode === 13 && current.href) {
			window.location = current.href;
			return;
		}
		if (current) {
			current.classList.remove(activeClass);
		}
		next.classList.add(activeClass);
	});
}

export default typeAhead;
