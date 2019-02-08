const mongoose = require('mongoose');

const referralHistorySchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    referral_code: String,
    created_date: { type: Date, default: Date.now }
});

ReferralHistory = mongoose.model('referral-history', referralHistorySchema); 
module.exports = ReferralHistory;