const mongoose = require('mongoose');

const rewardHistorySchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    user_id:{type:Number,required:true},
    type:{type:String,required:true},
    reward: { type: String, required: true },
    reward_asset:{type:String},
    is_referral:{type:Boolean, default:false},
    created_date: { type: Date, default: Date.now }
});

ReferralHistory = mongoose.model('reward-history', rewardHistorySchema);
module.exports = ReferralHistory;