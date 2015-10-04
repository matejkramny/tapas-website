// Manifest
[
	'Section',
	'Item',
	'Config'
].forEach(function (model) {
	module.exports[model] = require('./' + model);
})