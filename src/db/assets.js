const mongoose = require('mongoose');
require('mongoose-type-url');
const assetsSchema = new mongoose.Schema({
    asset_name: { type: String, unique: true, index: true },
    asset_code: { type: String, unique: true, index: true },
    unit: String,
    logo_url: { type: mongoose.SchemaTypes.Url, required: true, index: true },
    url: { type: mongoose.SchemaTypes.Url, required: true, index: true },
    address_url: { type: mongoose.SchemaTypes.Url, required: true, index: true },
    block_url: { type: mongoose.SchemaTypes.Url, required: true, index: true },
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
    withdrawal_fee: { type: Number, index: true },
    minimum_withdrawal: { type: Number, index: true },
    minimum_deposit: { type: Number, index: true },
    delist: { type: Boolean, default: false },
    deposit: { type: Boolean, default: true },
    withdraw: { type: Boolean, default: true },
    token: { type: String, default: null },
    status: { type: Number, default: 2 },  // 1 => Pending   2 => list 
    reason_for_deposit: { type: String, default: null },
    reason_for_withdraw: { type: String, default: null },
    markets: mongoose.Schema.Types.Mixed,
    payment_id: { type: Boolean, default: false },
    type: { type: String, default: null },
    maitenance: { type: Boolean, default: false },
    precision: { type: Number },
    withdraw_fee_percentage: { type: Number }

});

let assets = mongoose.model('assets', assetsSchema);
assets.createIndexes()
module.exports = assets;