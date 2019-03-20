const mongoose   = require('mongoose');
const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const path       = require('path');

// routes
const registrationRoutes = require('./src/routes/registration');
const userRoutes = require('./src/routes/user');

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password'),
    database = config.get('database.database');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(`/api/${config.get('site.version')}/user/registration`,registrationRoutes);
app.use(`/api/${config.get('site.version')}/user`,userRoutes);

// swagger api documentation
require('./api.docs');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static('dist'));

var subpath = express();

subpath.get('/', function (req, res) {
    res.sendfile(__dirname + '/dist/index.html');
});

app.use('/doc', subpath);


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