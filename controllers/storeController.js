// exports.myMiddleware = (req, res, next) => {
// 	req.name = 'Dan';
// 	next();
// };

const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto) {
			next(null, true);
		} else {
			next({ message: 'That is not a photo.' }, false);
		}
	}
};

exports.homePage = (req, res) => {
	console.log(req.name);
	res.render('index');
};

exports.addStore = (req, res) => {
	res.render('editStore', { title: 'Add a Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
	// see if there is new file to resize
	if (!req.file) {
		next(); // skip to next middleware
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);
	// once we have written the photo to our filesystem, keep going!
	next();
};

exports.createStore = async (req, res) => {
	req.body.author = req.user._id;
	const store = await new Store(req.body).save();
	await store.save();
	req.flash(
		'success',
		`Created ${store.name} successfully. Would you like to add a review?`
	);
	res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
	const page = req.params.page || 1;
	const limit = 4;
	const skip = (page * limit) - limit;
	// 1. Query database for list of all stores
	const storesPromise = Store.find()
		.skip(skip)
		.limit(limit)
		.sort({ created: 'desc' });

	const countPromise = Store.count();

	const [stores, count] = await Promise.all([storesPromise, countPromise]);
	const pages = Math.ceil(count / limit);

	if (!stores.length && skip) {
		req.flash('info', `You asked for page ${page}. That page does not exist. So, here you are at the end of existence. Learn to use the site, dummy.`);
		res.redirect(`/stores/page/${pages}`);
	}

	res.render('stores', { title: 'Stores', stores, pages, count, page });
};

const confirmOwner = (store, user) => {
	if (!store.author.equals(user._id)) {
		throw Error('You must be the owner to edit this store.');
	}
};
exports.editStore = async (req, res) => {
	// 1. find store from id
	const store = await Store.findOne({ _id: req.params.id });
	// 2. confirm store owner
	confirmOwner(store, req.user);
	// 3. render out edit form
	res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
	// set location data to be a point
	req.body.location.type = 'Point';
	// 1. find and update store
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // returns new store over old one
		runValidators: true
	}).exec();
	// 2. redirect and confirm
	req.flash(
		'success',
		`${store.name} has been successfully updated. <a href="/stores/${
		store.slug
		}">View ${store.name}</a>`
	);
	res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug }).populate(
		'author reviews'
	);
	if (!store) return next();
	res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag;
	const tagQuery = tag || { $exists: true };
	const tagsPromise = Store.getTagsList();
	const storesPromise = Store.find({ tags: tagQuery });
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
	res.render('tags', { tags, title: 'Tags', tag, stores });
};
exports.searchStores = async (req, res) => {
	const stores = await Store
		// find stores that match
		.find(
			{
				$text: {
					$search: req.query.q
				}
			},
			{
				score: { $meta: 'textScore' }
			}
		)
		// Sort by keyword usage
		.sort({
			score: { $meta: 'textScore' }
		})
		// limit to five results.
		.limit(5);
	res.json(stores);
};

exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates
				},
				$maxDistance: 10000 // 10km
			}
		}
	};
	const stores = await Store.find(q)
		.select('slug name description location photo')
		.limit(10);
	res.json(stores);
};

exports.mapPage = (req, res) => {
	res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
	const hearts = req.user.hearts.map((obj) => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User.findByIdAndUpdate(
		req.user._id,
		{
			[operator]: { hearts: req.params.id }
		},
		{ new: true }
	);
	res.json(user);
};

exports.getHearts = async (req, res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	});
	res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	res.render('topStores', { stores, title: '★ Top Stores!' });
};
