const mongoose = require('mongoose');

const userAssetsSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset_id: { type: Schema.Types.ObjectId, ref: 'Assets' },
    balance: Number,
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: Boolean
});

UserAssets = mongoose.model('userAssets', userAssetsSchema); 
module.exports = UserAssets;