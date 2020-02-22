const mongoose = require('mongoose');
const userCoinVoteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    coin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'voting-coin-list', index: true },
    phase_id: { type: mongoose.Schema.Types.ObjectId, ref: 'voting-phases', index: true }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

let userCoinVote = mongoose.model('voted-users-list', userCoinVoteSchema);
userCoinVote.createIndexes();
module.exports = userCoinVote;