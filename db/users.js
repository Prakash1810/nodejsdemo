const mongoose = require('mongoose');

const usersSchema = mongoose.Schema({
    user_id: Number,
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

module.exports.checkEmail = async (email, res) => {
    Users.find({ email: email }).exec((err, user) => {
       if(user.length) res.status(400).send(helpers.errorFormat({ 'email': 'This email address already exits.'}));
    });
};
