const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    request: String,
    response: String,
    message: String,
    ip_address: String,
    create_date_time: { type: Date, default: Date.now }
});

AuditLog = mongoose.model('auditLog', auditLogSchema); 
module.exports = AuditLog;