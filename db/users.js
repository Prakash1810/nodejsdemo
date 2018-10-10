const mongoose = require('mongoose');

const usersSchema = mongoose.Schema({
    user_id: Number,
    email:{ 
        type:String,
        required:[ true, 'Your email cannot be blank.' ]	
    },
    mobile: String,
    password: String,
    mobile_code: String,
    referral_code: { type: String, default: null },
    sms_auth: Boolean, 
    google_auth: Boolean,
    anti_phishing_code: String,
    white_list_address: Boolean,
    is_active: Boolean,
    is_blocked: Boolean,
    beldex_discount: Boolean,
    level: Number, 
    created_date: { type: Date, default: Date.now },
    created_by: Number,
    modified_date: Date,
    modified_by: Number,
    is_deleted: Boolean
});

Users = mongoose.model('Users', usersSchema); 
module.exports = Users;