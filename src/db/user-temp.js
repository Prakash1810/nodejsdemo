const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const userTempSchema = new mongoose.Schema({
    email: { type: String, lowercase: true },
    password: String,
    referrer_code: { type: String, default: null },
    created_date: { type: Date, default: Date.now },
    modified_date: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
});

userTempSchema.pre('save', function (next) {
    const userTemp = this;
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


const UserTemp = module.exports = mongoose.model('user-temps', userTempSchema);

module.exports.removeUserTemp = async (id) => {
    return await UserTemp.deleteOne({ _id: id })
        .then(result => {
            if (result.deletedCount) {
                return true;
            } else {
                return false;
            }
        })
        .catch(err => {
            return false;
        });
};

module.exports.checkEmail = (email) => {
    try {
        return UserTemp.find({ email: email }).exec();
    } catch (error) {
        // handle query error
        // return res.status(500).send(error);
    }
};
