const mongoose = require('mongoose');

const loginSeqSchema = mongoose.Schema({
  login_seq:{type:Number,default:1}
});

loginSequence = mongoose.model('sequence', loginSeqSchema);
module.exports = loginSequence;