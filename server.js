var express = require('express'),
  app = express(),
  menu = require('./menu'),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose');

app.enable('trust proxy');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('x-powered-by', false);

app.use(require('morgan')('dev'));
app.use(require('serve-static')(__dirname));
app.use(require('cookie-parser')());
app.use(require('express-session')({
  secret: "d2cd6fefd08f4b7220218cc694982d1b",
  resave: true,
  saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.locals.sections = menu;
app.locals.promo = false;

app.get('/', function(req, res) {
  res.render('index');
}).get('/basket', function(req, res) {
  res.render('basket');
}).get('/promo', function(req, res) {
  res.render('promo');
}).get('/confirm', function(req, res) {
  res.render('confirm');
}).get('/item/:item_id', function(req, res) {
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
})

.post('/order', function (req, res) {
  // submit order
  res.status(204).end();
}).get('/login', function(req, res) {
  if (req.session.admin){
    return res.redirect('/admin')
  }

  res.render('login');
}).post('/login', function(req, res) {
  if (req.body.username=="admin" && req.body.password=="admin"){
    req.session.admin=true;
    return res.redirect('/admin')
  }

  res.render('login', {error: true})
}).get('/logout', function(req, res) {
  req.session.admin = false;
  res.redirect('/')
})

var admin = express.Router();
admin.get('/', function(req, res) {
  res.render('admin')
});

admin.get('/additem', function(req, res) {
 res.render('admin-additem');
});

admin.get('/logs', function(req, res) {
  res.render('admin-logs');
});

admin.get('/item/:item_id', function(req, res) {
  for (var section = 0; section < menu.length; section++) {
    var m = menu[section];
    for (var item = 0; item < m.items.length; item++) {
      if (m.items[item].id == req.params.item_id) {
        var _item = m.items[item];

        if (!_item.price) {
          _item.price = 0;
        }

        return res.render('admin-edititem', {item: _item});
      }
    }
  }
});

app.use('/admin', function (req, res, next) {
  if (req.session.admin) {
    return next();
  }

  res.redirect('/login');
}, admin);

require('http').createServer(app).listen(process.env.PORT || 3000, function () {
  console.log('listening to :'+(process.env.PORT || 3000));
});