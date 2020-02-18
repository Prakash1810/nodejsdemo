const mongoose = require('mongoose');
const votePhaseSchema = new mongoose.Schema({
    name: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    is_active: { type: Boolean, default: true }
});

let votePhase = mongoose.model('voting-phases', votePhaseSchema);
votePhase.createIndexes();
module.exports = votePhase;
