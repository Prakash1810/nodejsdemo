const mongoose = require('mongoose');
require('mongoose-type-url');

const noticeSchema = new mongoose.Schema({
    name: { type: String, index: true },
    start_time: { type: Date },
    end_time: { type: Date },
    comment: { type: String },
    is_active: { type: Boolean, default: true }
});
let notice = mongoose.model('maintenance-notice', noticeSchema);
notice.createIndexes();
exports.notice = notice;
