var express = require('express'),
	admin = express.Router(),
	models = require('../models'),
	server = require('../server'),
	routes = require('./'),
	crypto = require('crypto'),
	aws_secret_key_id = 'zz1NLE1PFB33oFnPb1cbDjnC+2BtHxxXLCXqV4e4',
	aws_access_key_id = 'AKIAI76QUIQR4LGRFDWA';

exports.route = function (router) {
	['', 'logs', 'printout'].forEach(render);
	admin
		.put('/config/:config_key', setConfig)
		.put('/config/promo/image', uploadPromo)
		.get('/orders', getOrders)
		.put('/order/:id', changeOrder)
		.delete('/order/:id', deleteOrder);

	// sections api
	// POST /admin/sections - Create a section
	// PUT /admin/section/1 - Update section
	// DELETE /admin/section/1 - Delete a sectoin
	admin
		.post('/sections', addSection)
		.put('/section/:section_id', updateSection)
		.delete('/section/:section_id', deleteSection);

	// items api
	// POST /admin/items - Add item (must ref section id)
	// PUT /admin/item/1 - Update item
	// DELETE /admin/item/1 - Delete item
	admin
		.post('/items', addItem)
		.put('/item/:item_id', updateItem)
		.delete('/item/:item_id', deleteItem)
		.put('/item/:item_id/image', uploadImage);

	router.use('/admin', authMiddleware, admin);
}

function render (page) {
	admin.get('/' + page, function (req, res) {
		if (page == 'printout') {
			routes.getSectionsData(function (err, sections) {
				if (err) throw err;

				res.render('admin/printout', {
					sections: sections
				});
			});
			return;
		}

		res.render('admin/' + (page == '' ? 'index' : page));
	});
}

function authMiddleware (req, res, next) {
	if (req.session.admin) {
		return next();
	}

	res.redirect('/login');
}

function getOrders (req, res) {
	models.Order.find().sort('timeSent').exec(function (_, orders) {
		res.send(orders)
	})
}

function changeOrder (req, res) {
	models.Order.findOne({_id: req.params.id},
		function (_, order) {
			if(!order) {
				return res.status(404).end();
			}

			order.status = req.body.status;
			// 0 = waiting
			// 1 = accepted
			// 2 = rejected

			server.io.emit(order.secureID, order);

			order.save(function (err) {
				if (err) {
					return res.status(400).end();
				}

				res.status(204).end();
			})
	});
}

function deleteOrder (req, res) {
	models.Order.remove({
		_id: req.params.id
	}, function (err) {
		if (err) {
			return res.status(400).end();
		}

		res.status(204).end();
	});
}
function setConfig (req, res) {
	if (!req.params.config_key || req.params.config_key.length == 0) {
		return res.status(400).end();
	}

	models.Config.findOne({
		key: req.params.config_key
	}, function (_, config) {
		if (!config) {
			config = new models.Config({
				key: req.params.config_key
			});
		}

		config.value = req.body.value;

		config.save(function (err) {
			if (err) {
				return res.status(400).end();
			}

			res.status(204).end();
		})
	});
}

function addSection (req, res) {
	var section = new models.Section(req.body);

	section.save(function (err) {
		if (err) throw err;

		res.status(201).send(section);
	});
}

function updateSection (req, res) {
	models.Section.findOne({
		_id: req.params.section_id
	}, function (_, section) {
		if (!section) {
			return res.status(404).end();
		}

		section.name = req.body.name;
		section.order = req.body.order;
		section.hidden = req.body.hidden;

		section.save(function () {
			res.status(204).end();
		});
	});
}

function deleteSection (req, res) {
	models.Section.remove({
		_id: req.params.section_id
	}, function (err) {
		if (err) throw err;

		res.status(204).end();
	});
}

function addItem (req, res) {
	var item = new models.Item(req.body);

	item.save(function (err) {
		if (err) throw err;

		res.status(201).send(item);
	});
}

function updateItem (req, res) {
	models.Item.findOne({
		_id: req.params.item_id
	}, function (_, item) {
		if (!item) {
			return res.status(404).end();
		}

		item.name = req.body.name;
		item.description = req.body.description;
		item.price = req.body.price;
		item.order = req.body.order;
		item.section = req.body.section;
		item.ingredients = req.body.ingredients;
		item.vegan = req.body.vegan;
		item.gluten_free = req.body.gluten_free;
		item.hidden = req.body.hidden;

		item.save(function () {
			res.status(204).end();
		});
	});
}

function deleteItem (req, res) {
	models.Item.remove({
		_id: req.params.item_id
	}, function (err) {
		if (err) throw err;

		res.status(204).end();
	});
}

function uploadPromo (req, res) {
	var contentType = req.body.contentType;
	var extension = req.body.extension;

	if (typeof extension !== 'string' || typeof contentType !== 'string') {
		return res.status(400).end();
	}

	var contentTypeCategory = contentType.split('/')[0];
	if (contentTypeCategory != 'image') {
		return res.status(400).send('Bad Content-Type').end();
	}

	extension = extension.substring(0, 3);

	var policy = {
		"expiration": "2020-01-01T00:00:00Z",
		"conditions": [
			{"bucket": "tapas-media"},
			["eq", "$key", 'promo.' + extension],
			{"acl": "public-read"},
			["eq", "$Content-Type", contentType],
			["starts-with", "$filename", ""],
			["content-length-range", 0, 524288000]
		]
	}

	var policyBase64 = new Buffer(JSON.stringify(policy)).toString('base64');
	var hash = crypto.createHmac('sha1', aws_secret_key_id).update(policyBase64).digest('base64');

	res.send({
		url: 'https://tapas-media.s3-eu-west-1.amazonaws.com/',
		name: 'promo.' + extension,
		policy: policyBase64,
		signature: hash,//new Buffer(hash).toString('base64'),
		AWSAccessKeyId: aws_access_key_id
	}).end();
}

function uploadImage (req, res) {
	var contentType = req.body.contentType;
	var extension = req.body.extension;

	if (typeof extension !== 'string' || typeof contentType !== 'string') {
		return res.status(400).end();
	}

	var contentTypeCategory = contentType.split('/')[0];
	if (contentTypeCategory != 'image') {
		return res.status(400).send('Bad Content-Type').end();
	}

	extension = extension.substring(0, 3);

	// update image extension in db
	models.Item.update({
		_id: req.params.item_id
	}, {
		$set: {
			has_image: true,
			extension: extension
		}
	}, function (err) {
		if (err) throw err;
	});

	var policy = {
		"expiration": "2020-01-01T00:00:00Z",
		"conditions": [
			{"bucket": "tapas-media"},
			["eq", "$key", req.params.item_id + '.' + extension],
			{"acl": "public-read"},
			["eq", "$Content-Type", contentType],
			["starts-with", "$filename", ""],
			["content-length-range", 0, 524288000]
		]
	}

	var policyBase64 = new Buffer(JSON.stringify(policy)).toString('base64');
	var hash = crypto.createHmac('sha1', aws_secret_key_id).update(policyBase64).digest('base64');

	res.send({
		url: 'https://tapas-media.s3-eu-west-1.amazonaws.com/',
		name: req.params.item_id + '.' + extension,
		policy: policyBase64,
		signature: hash,//new Buffer(hash).toString('base64'),
		AWSAccessKeyId: aws_access_key_id
	}).end();
}