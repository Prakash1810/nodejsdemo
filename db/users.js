const mongoose = require('mongoose');
const helpers   = require('../helpers/helper.functions');
const autoIncrement = require('mongoose-auto-increment');
const config     = require('config');

let host = config.get('database.host'),
    port = config.get('database.port'),
    user = config.get('database.user'),
    password = config.get('database.password'),
    database = config.get('database.database');

var connection = mongoose.connect(`mongodb://${user}:${password}@${host}:${port}/${database}`, { useNewUrlParser: true });

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

autoIncrement.initialize(connection);
usersSchema.plugin(autoIncrement.plugin, { model: 'users', field: 'user_id', startAt: 1 });

const Users = module.exports = mongoose.model('users', usersSchema); 

module.exports.checkEmail = async (email, res) => {
    Users.find({ email: email }).exec((err, user) => {
       if(user.length) return res.status(400).send(helpers.errorFormat({ 'email': 'This email address already exits.'}));
    });
};
