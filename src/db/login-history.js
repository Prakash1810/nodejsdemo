const mongoose = require('mongoose'), Schema = mongoose.Schema;

const loginHistorySchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    device: { type: Schema.Types.ObjectId, ref: 'device-management' },
    oauth_type: Boolean,
    auth_type: { type: Number, default: 1 },
    logout_status: { type: Number, default: 1 },
    login_date_time: { type: Date },
    logout_date_time: Date
});

module.exports = mongoose.model('login-history', loginHistorySchema);