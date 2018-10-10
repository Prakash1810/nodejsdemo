const mongoose = require('mongoose');

const usersSchema = mongoose.Schema({
    user_id: Number,
    email:{ 
        type:String,
        required:[ true, 'Your email cannot be blank.' ]	
    },
    role: { type: Schema.Types.ObjectId, ref: 'Roles' },
    mobile: { type: String, default: null },
    password: { 
        type:String,
        required:[ true, 'Your password cannot be blank.' ]	
    },
    mobile_code: { type: String, default: null },
    referral_code: { type: String, default: null },
    sms_auth: { type: Boolean, default: false },
    google_auth: { type: Boolean, default: false },
    anti_phishing_code: String,
    white_list_address: { type: Boolean, default: false },
    is_active: { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false },
    beldex_discount: { type: Boolean, default: false },
    level: Number, 
    created_date: { type: Date, default: Date.now },
    created_by: Number,
    modified_date: Date,
    modified_by: Number,
    is_deleted: { type: Boolean, default: false }
});

Users = mongoose.model('users', usersSchema); 
module.exports = Users;