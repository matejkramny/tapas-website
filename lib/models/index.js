// Manifest
[
	'Section',
	'Item',
	'Order',
	'Config'
].forEach(function (model) {
	module.exports[model] = require('./' + model);
})