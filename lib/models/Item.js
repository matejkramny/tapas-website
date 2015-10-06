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
		}
	}],
	vegan: Boolean,
	gluten_free: Boolean,
	hidden: Boolean
}

module.exports = mongoose.model('Item', schema);