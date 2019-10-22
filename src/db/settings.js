const mongoose = require('mongoose');

const settingsSchema= mongoose.Schema({
  type:String,
  amount:{type:Number,default:1}
});

settings = mongoose.model('setting', settingsSchema);
module.exports = settings;