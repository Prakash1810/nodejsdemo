const mongoose = require('mongoose');

const otpHistorySchema = mongoose.Schema({
    otp_type: { type: Schema.Types.ObjectId, ref: 'OtpTypes' },
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    mode: String,
    otp: String,
    create_date_time: { type: Date, default: Date.now }
});

OtpHistory = mongoose.model('otpHistory', otpHistorySchema); 
module.exports = OtpHistory;