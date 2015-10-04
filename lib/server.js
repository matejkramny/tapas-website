var app = require('express')(),
  menu = require('./menu'),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  path = require('path');

mongoose.connect('mongodb://127.0.0.1/tapas');

app.enable('trust proxy');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('x-powered-by', false);
app.set('port', process.env.PORT || 3000);

app.use(require('morgan')('dev'));
app.use(require('serve-static')(path.join(__dirname, '..', 'public')));
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

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

require('./routes').route(app);

require('http').createServer(app).listen(app.get('port'), function () {
  console.log('listening to :' + app.get('port'));
});