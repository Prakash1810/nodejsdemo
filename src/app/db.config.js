const mongoose   = require('mongoose');
const config     = require('config');
const user       = config.get('database.user');
const password   = config.get('database.password');
const host       = config.get('database.host');
const port       = config.get('database.port');
const database   = config.get('database.database');

// set mongoose Promise to Bluebird
mongoose.Promise = Promise;

// Exit application on error
mongoose.connection.on('error', (err) => {
  console.log(`MongoDB connection error: ${err}`);
  process.exit(-1);
});

// print mongoose logs in dev env
// if (env === 'development') {
    mongoose.set('debug', true);
// }

/**
* Connect to mongo db
*
* @returns {object} Mongoose connection
* @public
*/
exports.connect = () => {
  mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/${database}`, {
    keepAlive: 1,
    useNewUrlParser: true,
    autoIndex: false
  });
  return mongoose.connection;
};