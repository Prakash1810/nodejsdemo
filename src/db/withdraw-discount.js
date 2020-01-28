const mongoose = require('mongoose');

const discountSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    discount: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

withdrawDiscount = mongoose.model('withdraw-discount', discountSchema);
module.exports = withdrawDiscount;