const mongoose = require('mongoose');
const helpers   = require('../helpers/helper.functions');
const config     = require('config');
const usersSchema = mongoose.Schema({
    user_id: { type: Number, default: 0 },
    email:{ 
        type:String,
        required:[ true, 'Your email cannot be blank.' ]	
    },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles' },
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
    created_date: { type: Date },
    created_by: Number,
    modified_date: Date,
    modified_by: Number,
    is_deleted: { type: Boolean, default: false }
});

const Users = module.exports = mongoose.model('users', usersSchema); 

module.exports.checkEmail = (email) => {
    try {
        return Users.find({ email: email }).exec();
    } catch (error) {
        // handle query error
        // return res.status(500).send(error);
    }
};
