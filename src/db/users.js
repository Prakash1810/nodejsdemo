const mongooseConnect  = require('../app/db.config');
const mongoose         = require('mongoose');
const autoIncrement    = require('mongoose-auto-increment');

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
    anti_phishing_code: { type: String, default: null },
    white_list_address: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    is_blocked: { type: Boolean, default: false },
    beldex_discount: { type: Boolean, default: false },
    level: Number, 
    created_date: { type: Date, default: Date.now},
    created_by: Number,
    modified_date: Date,
    modified_by: Number,
    is_deleted: { type: Boolean, default: false }
});

autoIncrement.initialize(mongooseConnect.connect());
usersSchema.plugin(autoIncrement.plugin, { model: 'Users', field: 'user_id', startAt: 1 });

module.exports = mongoose.model('Users', usersSchema);