const mongoose = require('mongoose');

const transHistorySchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset_id: { type: Schema.Types.ObjectId, ref: 'Assets' },
    type: String,
    amount: Number,
    status: String,
    created_date: { type: Date, default: Date.now }
});

TransactionHistory = mongoose.model('transHistory', transHistorySchema); 
module.exports = TransactionHistory;