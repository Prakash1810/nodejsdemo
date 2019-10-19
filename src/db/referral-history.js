const mongoose = require('mongoose');

const referralHistorySchema = mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    referrer_code: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
});

ReferralHistory = mongoose.model('referral-history', referralHistorySchema);
module.exports = ReferralHistory;