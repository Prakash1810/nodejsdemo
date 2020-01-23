//const mongooseConnect  = require('../app/db.config');
const mongoose = require('mongoose');
// const autoIncrement    = require('mongoose-auto-increment');

const usersSchema = mongoose.Schema({
    user_id: { type: Number, default: 0, index: true },
    email: {
        type: String,
        required: [true, 'Your email cannot be blank.'],
        lowercase: true,
        index: true
    },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles' },
    mobile: { type: String, default: null },
    password: {
        type: String,
        required: [true, 'Your password cannot be blank.'],
        index: true
    },
    mobile_code: { type: String, default: null },
    referral_code: { type: String, default: null, index: true },
    referrer_code: { type: String, default: null },
    sms_auth: { type: Boolean, default: false },
    google_auth: { type: Boolean, default: false, index: true },
    google_secrete_key: { type: String, default: null, index: true },
    anti_spoofing: { type: Boolean, default: false, index: true },
    anti_spoofing_code: { type: String, default: null },
    white_list_address: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    is_blocked: { type: Boolean, default: false },
    beldex_discount: { type: Boolean, default: false },
    level: Number,
    created_by: Number,
    modified_by: Number,
    is_deleted: { type: Boolean, default: false },
    taker_fee: { type: String },
    maker_fee: { type: String },
    withdraw: { type: Boolean, default: true },
    password_reset_time: { type: Date }, total_btc: { type: Number, default: 0 },
    modified_date: { type: Date },
    total_usdt: { type: Number, default: 0 },
    kyc_verified: { type: Boolean, default: false },
    kyc_verified_date: Date,
    kyc_statistics: { type: String, default: null },
    vip: { type: Boolean, default: false, index: true },
    trade: { type: Boolean, default: true },
    reason_for_withdraw: { type: String, default: null },
    deposit_status: { type: Boolean, default: false },
    dailyWithdrawAmount: { type: Number, index: true },
    monthWithdrawAmount: { type: Number, index: true },
    api_key: { type: String, default: null, index: true },
    currency_code: { type: String, index: true },
    last_login_time: { type: Date },
    last_logout_time: { type: Date }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date_time' }
});

// autoIncrement.initialize(mongooseConnect.connect());
// usersSchema.plugin(autoIncrement.plugin, { model: 'Users', field: 'user_id', startAt: 1 });

let Users = mongoose.model('Users', usersSchema);
Users.createIndexes()
module.exports = Users;