const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const compress   = require('compression');
const cors       = require('cors');
const helmet     = require('helmet');
const routes     = require('../routes');
var app          = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

// gzip compression
app.use(compress());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// mount api v1 routes
app.use(`/api/${config.get('site.version')}`, routes);

module.exports = app;