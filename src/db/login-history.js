const mongoose = require('mongoose'), Schema = mongoose.Schema;

const loginHistorySchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users', index: true },
    device: { type: Schema.Types.ObjectId, ref: 'device-management', index: true },
    logout_status: { type: Number, default: 1, index: true },
    oauth_type: Boolean,
    auth_type: { type: Number, default: 1 },  // 1 => email otp  2 => g2f  3 => sms
    login_date_time: { type: Date },
    logout_date_time: Date
});

let loginHistory = mongoose.model('login-history', loginHistorySchema);
loginHistory.createIndexes()
module.exports = loginHistory;