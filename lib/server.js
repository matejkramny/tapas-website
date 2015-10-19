var app = require('express')(),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  path = require('path'),
  config = require('../config.js');

mongoose.connect(config.mongo);

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

app.locals.sections = [];

exports.app = app;

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

var routes = require('./routes');
routes.route(app);
// caches sections in app.locals
routes.getSectionsData(function () {})

var server = require('http').createServer(app);
exports.io = require('socket.io')(server);

server.listen(app.get('port'), function () {
  console.log('listening to :' + app.get('port'));
});