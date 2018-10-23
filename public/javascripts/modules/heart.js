import axios from 'axios';
import { $ } from './bling';
import { S_IFCHR } from 'constants';

function ajaxHeart(e) {
	e.preventDefault();
	console.log('big hearts yall!!!');
	axios
		.post(this.action)
		.then((res) => {
			const isHearted = this.heart.classList.toggle('heart__button--hearted');
			$('.heart-count').textContent = res.data.hearts.length;
			if (isHearted) {
				this.heart.classList.add('heart__button--float');
				setTimeout(() => this.heart.classList.remove('heart__button--float'));
			}
		})
		.catch(console.error);
}

export default ajaxHeart;
