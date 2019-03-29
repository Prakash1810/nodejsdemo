const mongoose = require('mongoose'), Schema = mongoose.Schema;

const userAssetsSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset_id: { type: Schema.Types.ObjectId, ref: 'Assets' },
    account_index: Number,
    address: String,
    public_key: String,
    private_key: String,
    balance: Number,
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: Boolean,
    is_disable: { type: Boolean, default: false }
});

module.exports = mongoose.model('user-assets', userAssetsSchema); 