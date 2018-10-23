const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
	res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
	res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
	req.sanitizeBody('name');
	req.checkBody('name', 'Please provide a name.').notEmpty();
	req.checkBody('email', 'Please enter a VALID email address.').isEmail();
	req.sanitizeBody('email').normalizeEmail({
		remove_dots: false,
		remove_extension: false,
		gmail_remove_subaddress: false
	});
	req.checkBody('password', 'You must enter a password.').notEmpty();
	req.checkBody('password-confirm', 'Please confirm your password.').notEmpty();
	req
		.checkBody('password-confirm', 'Your passwords do not match.')
		.equals(req.body.password);

	const errors = req.validationErrors();
	if (errors) {
		req.flash('error', errors.map((err) => err.msg));
		res.render('register', {
			title: 'Register',
			body: req.body,
			flashes: req.flash()
		});
		return; //stops function form running
	}
	next(); // continue if no errors
};

exports.register = async (req, res, next) => {
	const user = new User({ email: req.body.email, name: req.body.name });
	const registerWithPromise = promisify(User.register, User);
	await registerWithPromise(user, req.body.password);
	next(); // pass to authcontroller.login
};

exports.account = (req, res) => {
	res.render('account', { title: `Edit Yo' Self` });
};

exports.updateAccount = async (req, res) => {
	const updates = {
		name: req.body.name,
		email: req.body.email
	};

	const user = await User.findOneAndUpdate(
		{ _id: req.user._id },
		{ $set: updates },
		{ new: true, runValidators: true, context: 'query' }
	);
	req.flash('success', 'Profile Updated.');
	res.redirect('back');
};
