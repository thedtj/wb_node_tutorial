const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login',
	successRedirect: '/',
	successFlash: 'You are now logged in.'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'Thanks for logging out.');
	res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
	// check user for authentication
	if (req.isAuthenticated()) {
		next(); // user is logged in
		return;
	}
	req.flash('error', 'You must be logged in to add a store.');
	res.redirect('/login');
};

exports.forgot = async (req, res) => {
	// 1. Does user exist?
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		req.flash('error', 'No accounts associated with that email address.');
		return res.redirect('/login');
	}
	// 2. If yes, set reset tokens and expiration for account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from runtime
	await user.save();
	// 3. Send token via email
	const resetURL = `http://${req.headers.host}.account/reset/${
		user.resetPasswordToken
	}`;
	await mail.send({
		user,
		filename: 'password-reset',
		subject: 'Password Reset',
		resetURL
	});
	req.flash('success', `A password reset request has been sent.`);
	// 4. Redirect to Login page
	res.redirect('/login');
};

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	// If no user, send error, redirect to login
	if (!user) {
		req.flash('error', 'Password reset token is invalid or has expired.');
		return res.redirect('/login');
	}
	// If there is a user show password form
	res.render('reset', { title: 'Reset Your Password.' });
};

exports.confirmedPasswords = (req, res, next) => {
	if (req.body.password === req.body['password-confirm']) {
		next();
		return;
	}
	req.flash('error', 'Passwords do not match.');
	res.redirect('back');
};

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if (!user) {
		req.flash('error', 'Password reset token is invalid or has expired.');
		return res.redirect('/login');
	}
	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('Success', 'Your password has been reset. Good job, dummy.');
	res.redirect('/');
};
