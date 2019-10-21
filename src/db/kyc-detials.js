
const mongoose = require('mongoose');

const kycSchema = mongoose.Schema({
    user: { type:mongoose.Schema.Types.ObjectId, ref: 'Users' },
    first_name: { type: String, required: true },
    middle_name: { type: String },
    surname: { type: String },
    date_of_birth: { type: String, required: true },
    address: { type: String, required: true }
});


module.exports = mongoose.model('kyc-detials', kycSchema);