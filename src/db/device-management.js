const mongoose = require('mongoose'), Schema = mongoose.Schema;

const deviceSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users', index: true },
    mobile_id: { type: String },
    is_browser: { type: Boolean, index: true },
    is_mobile: { type: Boolean, index: true },
    is_app: { type: Boolean, index: true },
    os: { type: String, index: true },
    os_byte: String,
    browser: { type: String, index: true },
    browser_version: { type: String, index: true },
    city: String,
    region: String,
    country: String,
    verified: Boolean,
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: Date.now },
    is_deleted: { type: Boolean, default: false },
    ip: { type: String, required: true }
});

let deviceManagement = mongoose.model('device-management', deviceSchema);
deviceManagement.createIndexes()
module.exports = deviceManagement;