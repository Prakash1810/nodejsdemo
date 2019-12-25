const mongoose = require('mongoose');

const prepaidPlanSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    plan_id: { type: String, required: true },
    amount: { type: Number, required: true },
    volume: { type: Number, required: true },
    validity_date: { type: Date, required: true },
    plan_asset: { type: String, required: true },
    is_active: { type: String, default: true },
}, { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });

module.exports = mongoose.model('prepaid-plan', prepaidPlanSchema);;