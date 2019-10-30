const mongoose = require('mongoose');

const settingsSchema= mongoose.Schema({
 key:{type:String,required:true},
 value:mongoose.Schema.Types.Mixed,
 is_active:{type:Boolean,default:true}
});

settings = mongoose.model('config', settingsSchema);
module.exports = settings;