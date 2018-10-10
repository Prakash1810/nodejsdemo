const mongoose = require('mongoose');

const userAddressSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset_id: { type: Schema.Types.ObjectId, ref: 'Assets' },
    address: String,
    created_date: { type: Date, default: Date.now }
});

UserAddress = mongoose.model('user-address', userAddressSchema); 
module.exports = UserAddress;