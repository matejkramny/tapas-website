var express = require('express')
var admin = express.Router();

exports.route = function (router) {
	['', 'additem', 'logs', 'sections', 'printout'].forEach(render);
	admin.get('/item/:item_id', getItem);

	router.use('/admin', authMiddleware, admin);
}

function render (page) {
	admin.get('/' + page, function (req, res) {
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

				return res.render('admin/edititem', {item: _item});
			}
		}
	}
}