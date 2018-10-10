const mongoose = require('mongoose');

const userTempSchema = mongoose.Schema({
    email:{ 
        type:String,
        required:[ true, 'Your email cannot be blank.' ]		
    },
    password: String,
    referral_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: 0 },
});

UserTemp = mongoose.model('UserTmp', userTempSchema); 
module.exports = UserTemp;