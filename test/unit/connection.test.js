// const mongoose  = require('mongoose');
// const config    = require('config');

// // ES6 Promises
// mongoose.Promise = global.Promise;

// let host = config.get('database.host'),
//     port = config.get('database.port'),
//     user = config.get('database.user'),
//     password = config.get('database.password'),
//     database = config.get('database.database');

// before( async () => {
//     await mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/${database}`, { autoIndex: false, useNewUrlParser: true });
//     await mongoose.connection.once('open', () => {
//         console.log('database connected successfully.')
//     }).on('error', (error) => {
//         // console.log(error.message);
//     })
// });