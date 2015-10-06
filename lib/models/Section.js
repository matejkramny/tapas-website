var schema = {
	name: String,
	order: {
		type: Number,
		min: 0
	},
	hidden: Boolean
}

module.exports = require('mongoose').model('Section', schema);