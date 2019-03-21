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
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

subpath.get('/', function (req, res) {
    res.sendFile(path.resolve('dist/index.html'));
});

// swagger api documentation
module.exports = subpath;