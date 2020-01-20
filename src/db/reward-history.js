const mongoose = require('mongoose');

const rewardHistorySchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    user_id: { type: Number, required: true, index: true },
    type: { type: String, required: true, index: true },
    reward: { type: String, required: true, index: true },
    reward_asset: { type: String },
    is_referral: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true }
});

let rewardHistory = mongoose.model('reward-history', rewardHistorySchema);
rewardHistory.createIndexes()
module.exports = rewardHistory;