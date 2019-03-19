//Swagger API Documentation
var routes = require('./src/routes');
var argv = require('minimist')(process.argv.slice(2));
var swagger = require("swagger-node-express");
var path = require('path');

//init internationalization / localization class
var i18n_module = require('i18n-nodejs');

const mongoose   = require('mongoose');
const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const UserServices  = require('./src/services/users');

const Controller    = require('./src/core/controller');

const controller = new Controller;
// set
process.env['NODE_ENV'] = 'development'

// authentication
const auth = require("./src/middleware/authentication");

// routes
const registrationRoutes = require('./src/routes/registration');
const userRoutes = require('./src/routes/user');

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password'),
    database = config.get('database.database');

var app = express();
const lang = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.use(`/api/${config.get('site.version')}/user/registration`,registrationRoutes);
app.use(`/api/${config.get('site.version')}/user`,userRoutes);

lang.post('/', (req, res) => {
    var _langFile = `./../../config/lang/${req.body.lang}.json`;
    var configLanguage = {
         "lang": req.body.lang,
         "langFile": _langFile
     }
     var i18n = new i18n_module(configLanguage.lang, configLanguage.langFile);    
     return res.status(200).json(controller.successFormat({
         'welcome' : i18n.__('WELCOME_MESSAGE')
     }));
 });

 app.use('/language', lang);

// Start
var subpath = express();
app.use('/doc', subpath);
swagger.setAppHandler(subpath);

swagger.setApiInfo({
    title: "example Express & Swagger API",
    description: "API to do something, manage something...",
    termsOfServiceUrl: "",
    contact: "yourname@something.com",
    license: "",
    licenseUrl: ""
});

//app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static('dist'));

//console.log('Working path is '.__dirname);

subpath.get('/', function (req, res) {
    res.sendfile(__dirname + '/dist/index.html');
});

swagger.configureSwaggerPaths('', 'api-docs', '');

var domain = 'localhost';
if(argv.domain !== undefined)
    domain = argv.domain;
else
    console.log('No --domain=xxx specified, taking default hostname "localhost".');

// var applicationUrl = 'http://' + domain + ':' + app.get('port');
var applicationUrl = 'http://' + domain;

//console.log('Application url',applicationUrl);
swagger.configure(applicationUrl, '1.0.0');

// End
app.listen(3000, () => {
    console.log('listening on port 3000!!')
});

mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/${database}`, { autoIndex: false, useNewUrlParser: true }).then( () => {
    console.log("DB connection successful");
},
(err) => {
    console.log("DB connection failed");
});

module.exports = app;