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
const cookieParser = require('cookie-parser');
const csrf         = require('csurf');
var csrfProtection = csrf({ cookie: true });
app.use(cookieParser());
// app.use(csrfProtection);
// error log 
require('./winston');

// const corsOptions = {
//   origin: 'http://localhost:3000',
//   optionsSuccessStatus: 200 
// }

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

// gzip compression
app.use(compress());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

app.get('/api/v1',csrfProtection,(req,res)=>{
  res.cookie('XSRF-TOKEN', req.csrfToken());
  res.send({})
})

// mount api v1 routes with multi language features
app.use(`/api/${config.get('site.version')}`, cors() , (req, res, next) => {
  var langFilepath = `./lang/${req.body.lang}.json`;

  if (fs.existsSync(langFilepath)) {
    var requestedLang =  req.body.lang;
  } else {
    var requestedLang =  'en';
  }

  lang = new i18n(requestedLang, `./../../lang/${requestedLang}.json`);

  if( Object.keys(req.body).length !== 0 ) {
    AuditLog.collection.insert({
      //user_id : (req.body.data.user_id !== undefined) ? req.body.data.user_id : '',
      request: req.body,
      response: null,
      path: req.path,
      //ip_address: (req.body.data.attributes !== undefined && req.body.data.attributes.ip !== undefined) ? req.body.data.attributes.ip : ''
    });
  } 
  next();
  }, routes);

module.exports = app;