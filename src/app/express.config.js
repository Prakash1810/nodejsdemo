const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const compress   = require('compression');
const cors       = require('cors');
const helmet     = require('helmet');
const routes     = require('../routes');
const i18n       = require('i18n-nodejs');
const fs         = require('fs')
const AuditLog   = require('../db/auditlog-history');

const app        = express();

// error log 
require('./winston');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

// gzip compression
app.use(compress());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// mount api v1 routes with multi language features
app.use(`/api/${config.get('site.version')}`, cors() , (req, res, next) => {
  var langFilepath = `./lang/${req.body.lang}.json`;

  if (fs.existsSync(langFilepath)) {
    var requestedLang =  req.body.lang;
  } else {
    var requestedLang =  'en';
  }

  lang = new i18n(requestedLang, `./../../lang/${requestedLang}.json`);

  AuditLog.collection.insert({
    user_id : (req.body.data.user_id !== undefined) ? req.body.data.user_id : '',
    request: req.body,
    response: null,
    path: req.path,
    ip_address: req.body.data.attributes.ip
  });
    
  next();
  }, routes);

module.exports = app;