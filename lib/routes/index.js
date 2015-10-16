var models = require('../models'),
	async = require('async'),
	app = require('../server'),
	config = require('../../config.js'),
	redis = require('redis');

var redis_c = redis.createClient('redis://ks1.castawaylabs.com:16079', {
	auth_pass: 'vaiwaiJ9fabeiwuQuieM7ieYeeboa0uu2the7OojeThai8ohNu5ou1bae8tiechahph0ohtoh8Pheibeiw0Ailel1shugh3Lub2kieng2Teidoomai9phaosiengitahngah5Dei4kaey6aoB0aace2aihievoocaishae6kieleiY5ahw3eighoopiacai2xequevae'
});

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
	var items = [];
	async.each(req.body.items, function (reqitem, cb) {
		models.Item.findOne({
			_id: reqitem.id
		}).populate('section')
		.lean()
		.exec(function (err, item) {
			if (err || !item) {
				cb('not found');
			}

			var ingredients = [];

			if (reqitem.ingredients && reqitem.ingredients.length > 0) {
				for (var i = 0; i < item.ingredients.length; i++) {
					for (var x = 0; x < reqitem.ingredients.length; x++) {
						if (reqitem.ingredients[x].id == item.ingredients[i]._id) {
							ingredients.push(' - ' + item.ingredients[i].name + " " + parseInt(reqitem.ingredients[x].value) + "x (default: " + item.ingredients[i].default_quantity + ")");
						}
					}
				}
			}

			item.wantedIngredients = ingredients;

			items.push(item);
			cb();
		});
	}, function (err) {
		if (err) {
			return res.status(400).end();
		}

		var text = '';

		text += '\n Name: ' + req.body.customer.name;
		text += '\n Address: ' + req.body.customer.address;
		text += '\n Phone: ' + req.body.customer.phone;
		text += '\n Email: ' + req.body.customer.email;

		for (var i = 0; i < items.length; i++) {
			text += '\n--------------\n ' + items[i].name;
			if (items[i].wantedIngredients) {
				text += '\n Mod Ingredients: \n';
				for (var x = 0; x < items[i].wantedIngredients.length; x++) {
					text += items[i].wantedIngredients[x] + '\n';
				}
			}
		}

		text += '\n\n Manage this order online!';

		redis_c.publish('orders', text);
		res.status(204).end();
	});
}

function doLogin (req, res) {
	if (req.body.username == config.adminName && req.body.password == config.adminPass){
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