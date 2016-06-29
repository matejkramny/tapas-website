var models = require('../models'),
	async = require('async'),
	app = require('../server'),
	config = require('../../config.js'),
	redis = require('redis'),
	GoogleMapsAPI = require('googlemaps'),
	uuid = require('node-uuid'),
	moment = require('moment');

var redis_c = redis.createClient('redis://ks1.castawaylabs.com:16079', {
	auth_pass: 'vaiwaiJ9fabeiwuQuieM7ieYeeboa0uu2the7OojeThai8ohNu5ou1bae8tiechahph0ohtoh8Pheibeiw0Ailel1shugh3Lub2kieng2Teidoomai9phaosiengitahngah5Dei4kaey6aoB0aace2aihievoocaishae6kieleiY5ahw3eighoopiacai2xequevae'
});

var gMapsConfig = {
	key: 'AIzaSyCADG-iAl6-NohH7OT1Wc4XzEYZI5H2el0',
	stagger_time:       1000, // for elevationPath
	encode_polylines:   false,
	secure:             true // use https
};
var gmAPI = new GoogleMapsAPI(gMapsConfig);

exports.route = function (router) {
	['', 'basket', 'confirm', 'login', 'about'].forEach(render(router));

	router
		.get('/item/:item_id', getItem)
		.post('/order', submitOrder)
		.get('/order/:secure_id', getOrder)

		.get('/config/:config_key', getConfig)
		.get('/config', getConfigAll)
		.get('/sections', getSections)

		.post('/login', doLogin)
		.get('/logout', doLogout)

		.get('/distance/:postcode', getDistance);

	require('./admin').route(router);
};

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

function getDistance(req, res) {
	if (!req.params.postcode) return res.status(400).end();
	calculateDistance(req.params.postcode, function (result) {
		res.send(result).end()
	}, function () {
		res.status(400).end()
	})
}

function calculateDistance(postcode, cb, error) {
	var request = {
		origin: 'OX2 9DU',
		destination: postcode
	};
	gmAPI.directions(request, function (err, result){
		if (result && result.status == "OK") {
			if (cb) {
				cb(String((result.routes[0].legs[0].distance.value/1609.34).toFixed(2)))
			} else {return (result.routes[0].legs[0].distance.value/1609.34).toFixed(2)}
		}
		else if (error) error();
	});
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

function charge (distance) {
	if (distance <= 2) return 1; else return Math.ceil(distance-1)
}

function submitOrder (req, res) {
	var closed = false;
	var openTimes = {
		"Mon": false,
		"Tue": [{hour: 17}, {hour:22, minute:30}],
		"Wed": [{hour: 17}, {hour:22, minute:30}],
		"Thu": [{hour: 17}, {hour:22, minute:30}],
		"Fri": [{hour: 17}, {hour:22, minute:30}],
		"Sat": [{hour: 17}, {hour:22, minute:30}],
		"Sun": [{hour: 17}, {hour:22, minute:30}]
	}
	models.Config.findOne({key:"closed"}, function (err, result) {
		if (result) closed = result.value == "true";
		if (!closed) {
			// submit order
			var now = moment();
			var today = openTimes[now.format("ddd")];
			if (today === false) {
				return res.status(406).end()
			}
			var open = moment(today[0])
			var closed = moment(today[1])
			if (!now.isBetween(open, closed)) {
				return res.status(406).end()
			}
			var items = [];
			var distance = 0;
			var validPostcodes = ["OX1", "OX2", "OX3", "OX4"];
			var county = req.body.customer.postcode.substr(0,req.body.customer.postcode.indexOf(' '));
			if (validPostcodes.indexOf(county) < 0) {
				return res.status(400).end();
			}
			calculateDistance(req.body.customer.postcode, function (result) {
				distance = result;
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
						var rawIngredients = [];
						if (reqitem.ingredients && reqitem.ingredients.length > 0) {
							for (var i = 0; i < item.ingredients.length; i++) {
								for (var x = 0; x < reqitem.ingredients.length; x++) {
									if (reqitem.ingredients[x].id == item.ingredients[i]._id) {
										if (reqitem.ingredients[x].value != item.ingredients[i].default_quantity) {
											ingredients.push('- ' + item.ingredients[i].name + " " + parseInt(reqitem.ingredients[x].value) + "x (normal " + item.ingredients[i].default_quantity + ")");
										}
										rawIngredients.push({
											id: reqitem.ingredients[x].id,
											name: item.ingredients[i].name,
											value: parseInt(reqitem.ingredients[x].value),
											default_quantity: item.ingredients[i].default_quantity
										})
									}
								}
							}
						}
						item.wantedIngredients = ingredients;
						item.rawIngredients = rawIngredients;
						item.quantity = reqitem.quantity;
						item.id = reqitem.id;
						items.push(item);
						cb();
					});
				}, function (err) {
					if (err) {
						return res.status(400).end();
					}
					var total = 0;

					var dbItems = [];
					var text = '';

					text += '\nName: ' + req.body.customer.name;
					text += '\nHouse #: ' + req.body.customer.houseNr;
					text += '\nPostcode: ' + req.body.customer.postcode;
					text += '\nPhone: ' + req.body.customer.phone;
					text += '\nEmail: ' + req.body.customer.email;
					for (var i = 0; i < items.length; i++) {
						total += items[i].price*req.body.items[i].quantity;
						text += '\n--------------\n ' + items[i].order + " x " + req.body.items[i].quantity + " - " + items[i].name + " - (" + (items[i].price*req.body.items[i].quantity).toFixed(2) + " GBP)";
						if (items[i].wantedIngredients>0) {
							text += '\n Ingredients: \n';
							for (var x = 0; x < items[i].wantedIngredients.length; x++) {
								text += items[i].wantedIngredients[x] + '\n';
							}
						}
						var dbIngredients = [];
						if (items[i].rawIngredients) {
							for (var x = 0; x < items[i].rawIngredients.length; x++) {
								dbIngredients.push({
									id: items[i].rawIngredients[x].id,
									name: items[i].rawIngredients[x].name,
									default_quantity: items[i].rawIngredients[x].default_quantity,
									value: items[i].rawIngredients[x].value
								});
							}
						}

						dbItems.push({
							id: items[i].id,
							quantity: items[i].quantity,
							name: items[i].name,
							price: items[i].price,
							ingredients: dbIngredients
						})
					}

					text += "\n\nDistance: " + distance + " miles (charge " + charge(distance).toFixed(2) + " GBP)";

					text += '\nTotal: ' + (total+charge(distance)).toFixed(2) + " GBP";

					text += '\n\nManage this order online!';

					for (var i = 0; i<req.body.items; i++) {
						req.body.items[i].item = req.body.items[i].id
					}

					var order = new models.Order({
						name: req.body.customer.name,
						houseNr: req.body.customer.houseNr,
						postcode: req.body.customer.postcode,
						phone: req.body.customer.phone,
						email: req.body.customer.email,
						timeSent: new Date().getTime(),
						items: dbItems,
						total: total + charge(distance),
						totalFormatted: '£ ' + (total + charge(distance)).toFixed(2),
						distancePrice: charge(distance),
						distancePriceFormatted: '£ ' + charge(distance).toFixed(2),
						distance: distance,
						secureID: uuid.v4()
					});
					order.save();
					console.log(JSON.stringify(order));

					// redis_c.publish('orders', text);
					app.io.emit('order', order);
					res.status(200).send(order).end();
				});
			});
		} else return res.status(406).end();
	});
}

function getOrder (req, res) {
	models.Order.findOne({
		secureID: req.params.secure_id
	}, function (err, order) {
		if (err || !order) {
			return res.status(400).end();
		}

		return res.send(order).end();
	});
}

function doLogin (req, res) {
	if (req.body.username == config.adminName && req.body.password == config.adminPass){
		req.session.admin = true;
		return res.redirect('/admin')
	}
	console.log("Failed login attempt from "+(req.headers['x-forwarded-for'] || req.connection.remoteAddress)+" at "+new Date());
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