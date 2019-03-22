const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const compress   = require('compression');
const cors       = require('cors');
const helmet     = require('helmet');
const routes     = require('../routes');
const i18n       = require('i18n-nodejs');

const app        = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

// gzip compression
app.use(compress());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// mount api v1 routes with multi language features
app.use(`/api/${config.get('site.version')}`, (req, res, next) => {
    var requestedLang = (req.body.lang !== undefined) ? req.body.lang : 'en';
    lang = new i18n(requestedLang, `./../../lang/${requestedLang}.json`);
    next();
  }, routes);

module.exports = app;