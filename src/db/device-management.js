const mongoose = require('mongoose'), Schema = mongoose.Schema;

const deviceSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    mobile_id: {type: String},
    is_browser: Boolean,
    is_mobile: Boolean,
    is_app:Boolean,
    os: String,
    os_byte: String,
    browser: String,
    browser_version: String,
    city: String,
    region: String,
    country: String,
    verified: Boolean,
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: Date.now },
    is_deleted: {type:Boolean, default:false},
    ip:{ type :String, required :true}
});

module.exports = mongoose.model('device-management', deviceSchema);