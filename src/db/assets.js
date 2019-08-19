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
    parent_code: String,
    minimum_withdraw: Number,
    maximum_withdraw: Number,
    gas: Number,
    enable_withdraw: Boolean,
    enable_charge: Boolean,
    regex: String,
    reset_address_status: Boolean,
    is_suspend: Boolean,
    created_date: { type: Date, default: Date.now },
    created_by: Number,
    modified_date: Date,
    modified_by: Number,
    is_deleted: Boolean,
    withdrawal_fee: Number,
    minimum_withdrawal: Number
});

module.exports = mongoose.model('assets', assetsSchema);