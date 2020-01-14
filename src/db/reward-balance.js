const mongoose = require('mongoose');

const rewardbalanceSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    reward_asset: { type: String, index: true },
    reward: { type: Number, required: true, index: true },
    is_deleted: { type: Boolean, default: false }
},
    { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });

let rewardBalance = mongoose.model('reward-balance', rewardbalanceSchema);
rewardBalance.createIndexes()
module.exports = rewardBalance;