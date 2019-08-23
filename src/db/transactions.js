const mongoose = require('mongoose'), Schema = mongoose.Schema;

const transactionSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'Users' },
    asset: { type: Schema.Types.ObjectId, ref: 'assets' },
    address: String,
    type: String,
    amount: Number,
    tx_hash: { type: String, default: null },
    fee: { type: Number, default: null },
    final_amount: { type: Number, default: null },
    status: { type: Number, default: 1}, // 1 => Pending / 2 => Success / 3 => Failure / 4 => Waiting for an approval / 5 => email sent
    date: { 
        type: Date,
        default: Date.now,
        alias: 'created_date'
    },
    updated_date: Date,
    is_deleted: { type: Boolean, default: false },
    fee : {type: Number}

});

module.exports = mongoose.model('transaction', transactionSchema);