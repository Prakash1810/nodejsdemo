const mongoose = require('mongoose');

const loginHistorySchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    login_ip: String,
    device: String,
    os: String,
    oauth_type: Boolean,
    login_date_time: { type: Date, default: Date.now }
});

LoginHistory = mongoose.model('login-history', loginHistorySchema); 
module.exports = LoginHistory;