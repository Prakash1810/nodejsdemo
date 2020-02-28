const mongoose = require('mongoose');
const ieoSchema = new mongoose.Schema({
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    asset_details: { type: mongoose.Schema.Types.ObjectId, ref: 'asset-details', index: true },
    ieo_stage: { type: Number, required: true, index: true },
    ieo_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    session_supply: { type: Number, required: true },
    available_currency: { type: mongoose.Schema.Types.Mixed, index: true },
    token_distribution: { type: String, required: true },
    token_price: { type: Number, required: true },
    bonus: { type: String, required: true },
    status: { type: String, required: true },
    start_date: { type: Date },
    end_date: { type: Date }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

let ieo_details = mongoose.model('ieo-details', ieoSchema);
ieo_details.createIndexes();
module.exports = ieo_details;