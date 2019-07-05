const mongoose = require('mongoose');

const loginSeqSchema = mongoose.Schema({
  sequence_type:String,
  login_seq:{type:Number,default:1}
});

loginSequence = mongoose.model('sequence', loginSeqSchema);
module.exports = loginSequence;