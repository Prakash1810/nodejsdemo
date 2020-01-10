

const mongoose = require('mongoose');

const balanceSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    balance:mongoose.Schema.Types.Mixed,
    create_date:Date
});

module.exports =  mongoose.model('user-balance', balanceSchema);