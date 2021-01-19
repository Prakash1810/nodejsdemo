const mongoose = require('mongoose'), Schema = mongoose.Schema;

const withdrawAddressSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users', index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'assets', index: true },
    coin: { type: String, required: true, index: true },
    label: String,
    address: String,
    is_whitelist: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: { type: Boolean, default: false },
    payment_id: { type: String, default: '' }
});

let withdrawAddress = mongoose.model('withdrawal-address', withdrawAddressSchema);
withdrawAddress.createIndexes()
module.exports = withdrawAddress;