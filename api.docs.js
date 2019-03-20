const express    = require('express');
const argv         = require('minimist')(process.argv.slice(2));
const swagger      = require("swagger-node-express");
const config     = require('config');

// Start
var subpath = express();

swagger.setAppHandler(subpath);
swagger.configureSwaggerPaths('', 'api-docs', '');

var domain = config.get('site.url');
if(argv.domain !== undefined) {
    domain = argv.domain;
}

var applicationUrl = 'http://' + domain;

swagger.configure(applicationUrl, '1.0.0');

module.exports = swagger;