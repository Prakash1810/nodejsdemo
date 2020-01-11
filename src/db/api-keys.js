const mongoose = require('mongoose');

const apiKeys = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    user_id: { type: Number, index: true },
    is_deleted: { type: Boolean, default: false },
    apikey: { type: String, required: true, index: true },
    secretkey: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now },
    modified_date: { type: Date }

});

let apiKey = mongoose.model('api-key', apiKeys);
apiKey.createIndexes()
module.exports = apiKey;