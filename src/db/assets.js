const mongoose = require('mongoose');
require('mongoose-type-url');
const assetsSchema = new mongoose.Schema({
    asset_name: { type: String, unique: true, index: true },
    asset_code: { type: String, unique: true, index: true },
    unit: String,
    logo_url: { type: mongoose.SchemaTypes.Url, required: true },
    url: { type: mongoose.SchemaTypes.Url, required: true },
    address_url: { type: mongoose.SchemaTypes.Url, required: true },
    block_url: { type: mongoose.SchemaTypes.Url, required: true },
    confirm_times: Number,
    parent_code: String,
    exchange_confirmations: Number,
    minimum_product_withdraw: Number,
    coin_confirmations: Number,
    minimum_product_withdraw: Number,
    maximum_withdraw: Number,
    is_default: Boolean,
    gas: Number,
    enable_withdraw: Boolean,
    enable_charge: Boolean,
    regex: String,
    reset_address_status: Boolean,
    is_suspend: Boolean,
    created_date: { type: Date, default: Date.now },
    created_by: String,
    modified_date: Date,
    modified_by: Number,
    is_deleted: Boolean,
    withdrawal_fee: Number,
    minimum_withdrawal: Number,
    minimum_deposit: Number,
    delist: { type: Boolean, default: false },
    deposit: { type: Boolean, default: true },
    withdraw: { type: Boolean, default: true },
    token: { type: String, default: null },
    status: { type: Number, default: 2 },  // 1 => Pending   2 => list 
    reason_for_deposit: { type: String, default: null },
    reason_for_withdraw: { type: String, default: null },
    markets:mongoose.Schema.Types.Mixed

});

module.exports = mongoose.model('assets', assetsSchema);