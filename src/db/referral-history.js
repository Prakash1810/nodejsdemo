const mongoose = require('mongoose');

const referralHistorySchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    referrer_code: { type: String, required: true, index: true },
    amount: { type: String, index: true },
    email: { type: String, index: true },
    asset: { type: String },
    type: { type: String, index: true },
    created_date: { type: Date, default: new Date() }
});

ReferralHistory = mongoose.model('referral-history', referralHistorySchema);
ReferralHistory.createIndexes()
module.exports = ReferralHistory;