const mongoose = require('mongoose'), Schema = mongoose.Schema;

const withdrawAddressSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset: { type: Schema.Types.ObjectId, ref: 'assets' },
    label: String,
    address: String,
    is_whitelist: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('withdrawal-address', withdrawAddressSchema);