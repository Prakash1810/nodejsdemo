const mongoose   = require('mongoose');
const express    = require('express');
const config     = require('config');
const bodyParser = require('body-parser');

// routes
const registrationRoutes = require('./routes/registration');
const userRoutes = require('./routes/user');

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password'),
    database = config.get('database.database');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.use('/api/registration',registrationRoutes);
app.use('/api/user',userRoutes);

app.get('/', (req, res) => {
    res.send('App Works!!!!');
});

app.listen(3000, () => {
    console.log('listening on port 3000!!')
});


mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/${database}`, { useNewUrlParser: true }).then( () => {
    console.log("DB connection successful");
},
(err) => {
    console.log("DB connection failed");
});

module.exports = app;
