var models = require('../models'),
	async = require('async'),
	app = require('../server');

exports.route = function (router) {
	['', 'basket', 'confirm', 'login'].forEach(render(router));

	router
		.get('/item/:item_id', getItem)
		.post('/order', submitOrder)

		.get('/config/:config_key', getConfig)
		.get('/config', getConfigAll)
		.get('/sections', getSections)

		.post('/login', doLogin)
		.get('/logout', doLogout)

	require('./admin').route(router);
}

function render (router) {
	return function (page) {
		router.get('/' + page, function (req, res) {
			if (page != '')
				return res.render(page);

			getSectionsData(function (err, sections) {
				if (err) throw err;

				res.render('index', {
					sections: sections
				});
			});
		});
	}
}

function getItem (req, res) {
	if (!req.params.item_id) return res.status(400).end();

	models.Item.findOne({
		_id: req.params.item_id
	}).lean().exec(function (err, item) {
		if (err || !item) return res.status(404).end();

		res.send(item).end();
	});
}

function submitOrder (req, res) {
	// submit order
	res.status(204).end();
}

function doLogin (req, res) {
	if (req.body.username == "admin" && req.body.password == "admin"){
		req.session.admin = true;
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

function getConfigAll (req, res) {
	models.Config.find({}).select({ 'key': 1, 'value': 1, '_id': 0 }).exec(function (_, config) {
		if (!config) {
			res.status(404);
		}

		var configObj = {};
		for (var i = 0; i < config.length; i++) {
			var key = config[i].key;
			configObj[key] = config[i].value;

			if (configObj[key] == "true" || configObj[key] == "false") {
				configObj[key] = configObj[key] == "true";
			}
		}

		res.send(configObj);
	});
}

function getSections (req, res) {
	getSectionsData(function (err, sections) {
		if (err) throw err;

		res.send(sections);
	})
}

function getSectionsData (cb) {
	// get sections
	models.Section.find().sort('order').lean().exec(function (err, sections) {
		if (err) return cb(err);

		app.app.locals.sections = JSON.parse(JSON.stringify(sections));

		async.each(sections, function (section, cb) {
			models.Item.find({
				section: section._id
			})
			.sort('order')
			.lean()
			.exec(function (err, items) {
				if (err) return cb(err);

				section.items = items;
				cb();
			});
		}, function (err) {
			cb(err, sections);
		});
	});
}

exports.getSectionsData = getSectionsData;