const mongoose = require('mongoose');

const withdrawAddressSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset_id: { type: Schema.Types.ObjectId, ref: 'Assets' },
    address: String,
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: Boolean
});

module.exports = mongoose.model('withdrawal-address', withdrawAddressSchema);