var mongoose = require('mongoose');

var schema = {
	name: String,
	description: String,
	price: Number,
	order: {
		type: Number,
		min: 0
	},
	section: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Section'
	},
	ingredients: [{
		name: String,
		default_quantity: {
			type: Number,
			default: 1,
			min: 0,
			max: 2
		},
		deleted: {
			type: Boolean,
			default: false
		}
	}],
	vegan: Boolean,
	gluten_free: Boolean,
	hidden: Boolean,
	deleted: {
		type: Boolean,
		default: false
	},
	has_image: Boolean,
	extension: {
		type: String,
		default: "png"
	}
}

module.exports = mongoose.model('Item', schema);