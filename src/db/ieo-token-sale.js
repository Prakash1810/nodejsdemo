const mongoose = require('mongoose')
const ieoTokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    ieo: { type: mongoose.Schema.Types.ObjectId, ref: 'ieo-details', index: true },
    buy_asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

let ieo_token_sales = mongoose.model('ieo-token-sales', ieoTokenSchema);
ieo_token_sales.createIndexes();
module.exports = ieo_token_sales;