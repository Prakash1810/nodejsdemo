const mongoose = require('mongoose'), Schema = mongoose.Schema;

const deviceWhitelistSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users', index: true },
    os: { type: String, index: true },
    browser: { type: String, index: true },
    city: String,
    region: String,
    verified: Boolean,
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: Date.now },
    is_deleted: { type: Boolean, default: false },
    last_login_ip: { type: String, index: true }
});

let deviceWhiteList = mongoose.model('device-whitelist', deviceWhitelistSchema);
deviceWhiteList.createIndexes()
module.exports = deviceWhiteList;