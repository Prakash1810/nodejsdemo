const mongoose = require('mongoose');
const coinVotingSchema = new mongoose.Schema({
    phase_id: { type: mongoose.Schema.Types.ObjectId, ref: 'voting-phases', index: true, required: true },
    coin_name: { type: String, index: true },
    coin_code: { type: String, index: true },
    number_of_vote: { type: Number, default: 0 },
    logo_url: { type: String }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

let coinVote = mongoose.model('voting-coin-list', coinVotingSchema);
coinVote.createIndexes();
module.exports = coinVote;