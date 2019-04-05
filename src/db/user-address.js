const mongoose = require('mongoose'), Schema = mongoose.Schema;

const userAddressSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset: { type: Schema.Types.ObjectId, ref: 'Assets' },
    address: String,
    created_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('user-address', userAddressSchema);