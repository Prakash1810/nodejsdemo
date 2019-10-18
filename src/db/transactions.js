const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets' },
    address: String,
    type: String,
    amount: Number,
    tx_hash: { type: String, default: null },
    fee: { type: Number, default: 0 },
    final_amount: { type: Number, default: 0},
    status: { type: Number, default: 0}, // 1 => Pending / 2 => Success / 3 => Failure / 4 => Waiting for an approval 
    date: { 
        type: Date,
        default: Date.now,
        
    },
    updated_date: Date,
    is_deleted: { type: Boolean, default: false },
  

});

module.exports = mongoose.model('transaction', transactionSchema);