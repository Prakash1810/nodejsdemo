const express    = require('express');
const argv       = require('minimist')(process.argv.slice(2));
const swagger    = require("swagger-node-express");
const config     = require('config');
const path       = require('path');

// Start
var subpath = express();
var app     = express();

swagger.setAppHandler(subpath);
swagger.configureSwaggerPaths('', 'api-docs', '');

var domain = config.get('site.url');
if(argv.domain !== undefined) {
    domain = argv.domain;
}

var applicationUrl = 'http://' + domain;

swagger.configure(applicationUrl, '1.0.0');

// swagger api documentation
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use('/doc', subpath);

subpath.get('/', function (req, res) {
    res.sendfile(__dirname + '/dist/index.html');
});

module.exports = { swagger, app };