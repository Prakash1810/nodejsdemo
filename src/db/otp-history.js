const mongoose = require('mongoose');

const otpHistorySchema = mongoose.Schema({
    otp_type: { type: mongoose.Schema.Types.ObjectId, ref: 'OtpTypes' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    mode: String,
    otp: String,
    create_date_time: { type: Date, default: Date.now },
    is_active: { type: String, default: false, index: true },
    type_for: { type: String, required: true, index: true },
    count: { type: Number, default: 1, index: true },
    time_expiry: { type: String, default: 'No' },
    modified_date: { type: Date }
});

OtpHistory = mongoose.model('otp-history', otpHistorySchema);
OtpHistory.createIndexes()
module.exports = OtpHistory;