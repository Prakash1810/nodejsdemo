const mongoose = require('mongoose');
const express = require('express');
const config = require('config');
const UserTemp = require('./db/user-temp');
const app = express();

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password');

app.get('/', (req, res) => {
    res.send('App Works!!!!');
});

app.listen(3000, () => {
    console.log('listening on port 3000!!')
});

mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/admin`, { useNewUrlParser: true }).then( () => {
    console.log("DB connection successful");
},
(err) => {
    console.log("DB connection failed");
});


    new UserTemp({
        email:"satz@mail.com",
        password:'123456'
    }).save()
    .then(item => {
        console.log("user temp added successfully");
    })
    .catch(err => {
        console.log(err);
    });




