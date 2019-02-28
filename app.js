const mongoose   = require('mongoose');
const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');
const UserTemp      = require('./src/db/user-temp');


// set
process.env['NODE_ENV'] = 'testing'

const auth = require("./src/middleware/authentication");

// routes
const registrationRoutes = require('./src/routes/registration');
const userRoutes = require('./src/routes/user');

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password'),
    database = config.get('database.database');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.use(`/api/${config.get('site.version')}/user/registration`,registrationRoutes);
app.use(`/api/${config.get('site.version')}/user`,userRoutes);

app.get('/', (req, res) => {
    UserTemp.findOne({ email: 'satz@mail.com' })
        .exec(function (err, adventure) {
                console.log('test')
                console.log(adventure.id)
                // let encryptedHash = helpers.encrypt(
                //     JSON.stringify({
                //         'id': adventure.id,
                //         'email': adventure.email
                //     })
                // );
                });
    res.send('App Workss!!!!');
});

app.get('*', auth, (req, res) => {
    res.status(404).send({ msg: 'not found'});
});

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