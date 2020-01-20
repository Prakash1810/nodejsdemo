const mongoose = require('mongoose');

const balanceSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    balance: { type: mongoose.Schema.Types.Mixed, index: true },
    create_date: Date
});

let userBalance = mongoose.model('user-balance', balanceSchema);
userBalance.createIndexes()
module.exports = userBalance;