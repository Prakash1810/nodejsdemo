const mongoose = require('mongoose')

const userAddressSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    address: String,
    paymentid : {type : String},
    created_date: { type: Date, default: Date.now }
});

let userAddress = mongoose.model('user-address', userAddressSchema);
userAddress.createIndexes()
module.exports = userAddress;