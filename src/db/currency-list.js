const mongoose = require('mongoose');
let schema = new mongoose.Schema({
    code: { type: String },
    currency_name: { type: String }
});
module.exports = mongoose.model('currency-list',schema);