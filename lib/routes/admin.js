var express = require('express'),
	admin = express.Router(),
	models = require('../models'),
	routes = require('./');

exports.route = function (router) {
	['', 'logs', 'printout'].forEach(render);
	admin.get('/item/:item_id', getItem)
		.put('/config/:config_key', setConfig)

	// sections api
	// POST /admin/sections - Create a section
	// PUT /admin/section/1 - Update section
	// DELETE /admin/section/1 - Delete a sectoin
	admin
		.post('/sections', addSection)
		.put('/section/:section_id', updateSection)
		.delete('/section/:section_id', deleteSection)

	// items api
	// POST /admin/items - Add item (must ref section id)
	// PUT /admin/item/1 - Update item
	// DELETE /admin/item/1 - Delete item
	admin
		.post('/items', addItem)
		.put('/item/:item_id', updateItem)
		.delete('/item/:item_id', deleteItem)

	router.use('/admin'/*, authMiddleware*/, admin);
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

function getItem (req, res) {
	for (var section = 0; section < menu.length; section++) {
		var m = menu[section];
		for (var item = 0; item < m.items.length; item++) {
			if (m.items[item].id == req.params.item_id) {
				var _item = m.items[item];

				if (!_item.price) {
					_item.price = 0;
				}

				if(!_item.attrs) {
					_item.attrs=[];
				}

				res.send(_item);
			}
		}
	}
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