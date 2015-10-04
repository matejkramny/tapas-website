var models = require('../models'),
	async = require('async');

exports.route = function (router) {
	['', 'basket', 'promo', 'confirm', 'login'].forEach(render(router));

	router
		.get('/item/:item_id', getItem)
		.post('/order', submitOrder)

		.get('/config/:config_key', getConfig)
		.get('/sections', getSections)

		.post('/login', doLogin)
		.get('/logout', doLogout)

	require('./admin').route(router);
}

function render (router) {
	return function (page) {
		router.get('/' + page, function (req, res) {
			res.render(page == '' ? 'index' : page);
		});
	}
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

				return res.send(_item).end();
			}
		}
	}

	res.status(404).end();
}

function submitOrder (req, res) {
	// submit order
	res.status(204).end();
}

function doLogin (req, res) {
	if (req.body.username=="admin" && req.body.password=="admin"){
		req.session.admin=true;
		return res.redirect('/admin')
	}

	res.render('login', {error: true})
}

function doLogout (req, res) {
	req.session.admin = false;
	res.redirect('/')
}

function getConfig (req, res) {
	if (!req.params.config_key || req.params.config_key.length == 0) {
		return res.status(400).end();
	}

	models.Config.findOne({
		key: req.params.config_key
	}, function (_, config) {
		if (!config) {
			res.status(404);
		}

		res.send(config);
	});
}

function getSections (req, res) {
	models.Section.find().lean().exec(function (_, sections) {
		async.each(sections, function (section, cb) {
			models.Item.find({
				section: section._id
			}).lean().exec(function (_, items) {
				section.items = items;
				cb();
			});
		}, function () {
			res.send(sections);
		});
	});
}