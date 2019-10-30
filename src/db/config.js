const mongoose = require('mongoose');

const settingsSchema= mongoose.Schema({
  type:mongoose.Schema.Types.Mixed
});

settings = mongoose.model('config', settingsSchema);
module.exports = settings;