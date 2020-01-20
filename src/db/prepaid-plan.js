const mongoose = require('mongoose');

const prepaidPlanSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    plan_name: { type: String, required: true, index: true },
    amount: { type: Number, required: true, index: true },
    volume: { type: Number, required: true, index: true },
    validity: { type: Date, required: true, index: true },
    plan_asset: { type: String, required: true, index: true },
    is_active: { type: String, default: true, index: true },
}, { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });

let prepaidPlan = mongoose.model('prepaid-plan', prepaidPlanSchema);;
prepaidPlan.createIndexes()
module.exports = prepaidPlan;