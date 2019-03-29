const mongoose = require('mongoose');

const assetsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    asset_name: String,
    asset_code: String,
    unit: String,
    logo_url: String,
    url: String,
    address_url: String,
    block_url: String,
    confirm_times: Number,
    coin_confirmations: Number,
    exchange_confirmations: Number,
    minimum_product_withdraw: Number,
    enable_withdraw: Boolean,
    enable_charge: Boolean,
    is_suspend: Boolean,
    is_deleted: Boolean,
    is_default: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    created_by: String,
    modified_date: Date,
    modified_by: String,
});

module.exports = mongoose.model('assets', assetsSchema); 