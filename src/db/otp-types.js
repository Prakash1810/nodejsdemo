const mongoose = require('mongoose');

const otpTypesSchema = mongoose.Schema({
    otp_type: String,
    description: String,
    otp_prefix: String,
    created_date: { type: Date, default: Date.now },
    modified_date: Date
});

OtpTypes = mongoose.model('otp-types', otpTypesSchema);
module.exports = OtpTypes;