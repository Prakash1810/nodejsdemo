const mongoose = require('mongoose'), Schema = mongoose.Schema;

const userAddressSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users', index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Assets', index: true },
    address: String,
    paymentid : {type : String},
    created_date: { type: Date, default: Date.now }
});

let userAddress = mongoose.model('user-address', userAddressSchema);
userAddress.createIndexes()
module.exports = userAddress;