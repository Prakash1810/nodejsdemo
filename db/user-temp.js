const mongoose = require('mongoose');

const userTempSchema = mongoose.Schema({
    email: String,
    password: String,
    referral_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
});

UserTemp = mongoose.model('user-temp', userTempSchema); 
module.exports = UserTemp;