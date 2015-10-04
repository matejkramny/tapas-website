var schema = {
	key: {
		type: String,
		required: true
	},
	value: String
}

module.exports = require('mongoose').model('Config', schema);