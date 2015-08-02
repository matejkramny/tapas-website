var app = require('express')();
var menu = require('./menu');

app.enable('trust proxy');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('x-powered-by', false);

app.use(require('serve-static')(__dirname));

app.get('/', function(req, res) {
  res.render('index', {
    sections: menu
  });
})
.get('/basket', function(req, res) {
  res.render('basket', {
    sections: menu
  });
})
.get('/promo', function(req, res) {
  res.render('promo', {
    sections: menu
  });
})
.post('/confirm', function(req, res) {
  res.render('confirm', {
    sections: menu
  });
})

require('http').createServer(app).listen(process.env.PORT || 3000, function () {
  console.log('listening to :'+(process.env.PORT || 3000));
});