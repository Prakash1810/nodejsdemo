const mongoose = require('mongoose');

const otpHistorySchema = mongoose.Schema({
    otp_type: { type: mongoose.Schema.Types.ObjectId, ref: 'OtpTypes' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    mode: String,
    otp: String,
    create_date_time: { type: Date, default: Date.now },
    is_active: { type: String, default: false },
    count: { type: Number, default: 0 }
});

OtpHistory = mongoose.model('otp-history', otpHistorySchema);
module.exports = OtpHistory;