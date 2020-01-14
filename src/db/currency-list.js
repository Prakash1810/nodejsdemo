const mongoose = require('mongoose');
let schema = new mongoose.Schema({
    code: { type: String, index: true },
    currency_name: { type: String, index: true }
});

currencyLists = mongoose.model('currency-list', schema);
currencyLists.createIndexes()
module.exports = currencyLists;


