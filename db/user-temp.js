const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const userTempSchema = mongoose.Schema({
    email: String,
    password: String,
    referral_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
});

userTempSchema.pre('save', function(next) {
    var userTemp = this;

    // only hash the password if it has been modified (or is new)
    if (!userTemp.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(userTemp.password, salt, (err, hash) => {
            if (err) return next(err);

            userTemp.password = hash;
            next();
        });
    });
});

userTempSchema.methods.removeUserTemp = async (id) => {
    await this.remove({_id:id })
	 .then(result => {
	 	return true;
	 })
	 .catch(err => {
	 	return false;
	 });
}

UserTemp = mongoose.model('user-temp', userTempSchema);

module.exports = UserTemp;