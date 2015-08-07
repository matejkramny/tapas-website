var app = require('express')();
var menu = require('./menu');

app.enable('trust proxy');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('x-powered-by', false);

app.use(require('morgan')('dev'))
app.use(require('serve-static')(__dirname));

app.locals.sections = menu;

app.get('/', function(req, res) {
  res.render('index');
}).get('/basket', function(req, res) {
  res.render('basket');
}).get('/promo', function(req, res) {
  res.render('promo');
}).get('/confirm', function(req, res) {
  res.render('confirm');
})

.get('/item/:item_id', function(req, res) {
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
})

require('http').createServer(app).listen(process.env.PORT || 3000, function () {
  console.log('listening to :'+(process.env.PORT || 3000));
});