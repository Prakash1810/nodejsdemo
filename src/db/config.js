const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
    key: { type: String, required: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, index: true },
    is_active: { type: Boolean, default: true, index: true }
});

let settings = mongoose.model('config', settingsSchema);
settings.createIndexes()
module.exports = settings;