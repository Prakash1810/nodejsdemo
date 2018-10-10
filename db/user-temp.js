const mongoose = require('mongoose');

const userTempSchema = mongoose.Schema({
    email:{ 
        type:String,
        required:[ true, 'Your email cannot be blank.' ]		
    },
    password: { 
        type:String,
        required:[ true, 'Your password cannot be blank.' ]		
    },
    referral_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
});

UserTemp = mongoose.model('user-temp', userTempSchema); 
module.exports = UserTemp;