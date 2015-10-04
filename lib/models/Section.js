var schema = {
	name: String,
	order: {
		type: Number,
		min: 0
	}
}

module.exports = require('mongoose').model('Section', schema);