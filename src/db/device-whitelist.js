const mongoose = require('mongoose'), Schema = mongoose.Schema;

const deviceWhitelistSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    os: String,
    browser: String,
    city: String,
    region: String,
    verified: Boolean,
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: Date.now },
    last_login_ip:{ type :String}
});

module.exports = mongoose.model('device-whitelist', deviceWhitelistSchema);