const mongoose = require('mongoose');

const referralHistorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    referral_code: String,
    created_date: { type: Date, default: Date.now }
});

ReferralHistory = mongoose.model('referralHistory', referralHistorySchema); 
module.exports = ReferralHistory;