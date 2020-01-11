
const mongoose = require('mongoose');

const kycSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    first_name: { type: String, required: true },
    middle_name: { type: String },
    surname: { type: String },
    date_of_birth: { type: String, required: true },
    address: { type: String, required: true },
    is_active: { type: Boolean, default: false },
    type_of_documentation: { type: String },
    documentation_id: { type: String },
    country: { type: String },
    code: { type: String },
    uid: { type: String },
    fractal_username:{type:String}
},{
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date_time' }
});


module.exports = mongoose.model('kyc-details', kycSchema);