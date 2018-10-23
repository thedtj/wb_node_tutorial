const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			trim: true,
			required: 'Please enter a store name.'
		},
		slug: String,
		description: {
			type: String,
			trim: true
		},
		tags: [String],
		created: {
			type: Date,
			default: Date.now
		},
		location: {
			type: {
				type: String,
				default: 'Point'
			},
			coordinates: [
				{
					type: Number,
					required: 'You must provide coordinates.'
				}
			],
			address: {
				type: String,
				required: 'You must provide an address.'
			}
		},
		photo: String,
		author: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: 'You must supply an author'
		}
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

// Define db indexes
storeSchema.index({
	name: 'text',
	description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
	if (!this.isModified('name')) {
		next(); // skip it
		return; // stop function from running
	}
	this.slug = slug(this.name);
	// find stores with matching names
	const slugREgEx = new RegExp(`^(${this.slug})((-[0-9%]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({ slug: slugREgEx });
	if (storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}

	next();
	// TODO make more resilient so slugs are unique
});

storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{ $unwind: '$tags' },
		{ $group: { _id: '$tags', count: { $sum: 1 } } },
		{ $sort: { count: -1 } }
	]);
};

storeSchema.statics.getTopStores = function() {
	return this.aggregate([
		// Lookup Stores and populate their reviews
		{
			$lookup: {
				from: 'reviews',
				localField: '_id',
				foreignField: 'store',
				as: 'reviews'
			}
		},
		// filter for stores with >= 2 reviews
		{ $match: { 'reviews.1': { $exists: true } } },
		// Add average reviews field
		{
			$addFields: {
				averageRating: { $avg: '$reviews.rating' }
			}
		},
		// sort by new field, highest first
		{
			$sort: {
				averageRating: -1
			}
		},
		// limit to 10 stores
		{ $limit: 10 }
	]);
};

//find reviews where stores __id === reviews store property.
storeSchema.virtual('reviews', {
	ref: 'Review',
	localField: '_id', // which field on the store db entry?
	foreignField: 'store' // which field on the review db entry?
});

function autoPopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema);
