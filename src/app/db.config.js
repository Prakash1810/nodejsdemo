const mongoose = require('mongoose');
const dotenv = require('dotenv');
// init environment configuration
dotenv.config();
// set mongoose Promise to Bluebird
mongoose.Promise = Promise;
// Exit application on error
mongoose.connection.on('error', (err) => {
  console.log(`MongoDB connection error: ${err}`);
  process.exit(-1);
});
// print mongoose logs in debug env
if (process.env.DEBUG === 'true') {
  mongoose.set('debug', true);
}
/**
* Connect to mongo db
*
* @returns {object} Mongoose connection
* @public
*/
exports.connect = () => {
//mongoose.connect(`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}`,
 mongoose.connect(`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CONNECTION}`,
    {
      keepAlive: 1,
      useNewUrlParser: true,
      autoIndex: false
    });
  return mongoose.connection;
};