const mongoose = require('mongoose');

const referralHistorySchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    referrer_code: { type: String, required: true },
    amount:{type:String},
    email:{type:String},
    type:{type:String},
    created_date: { type: Date, default:new Date() }
});

ReferralHistory = mongoose.model('referral-history', referralHistorySchema);
module.exports = ReferralHistory;