const mongoose = require('mongoose');

const matchingSchema = new mongoose.Schema({
   config: { type: String },
   value : { type: String }
});

module.exports = mongoose.model('matching-engine-config', matchingSchema);