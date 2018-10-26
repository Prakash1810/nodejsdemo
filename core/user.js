const Users     = require('../db/users');
const UserTemp  = require('../db/user-temp');
const helpers   = require('../helpers/helper.functions');
let user = {};

user.activate = (req, res, next) => {
    try {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        UserTemp.findById(userHash.id)
        .exec()
        .then(result => {
            if(result) {
                Users.create({
                    email: result.email,
                    password: result.password,
                    referral_code: result.referral_code,
                    created_date: result.created_date
                }, (err, user) => {
                    if (err) {
                        res.status(500).send(helpers.errorFormat(err))
                        next()
                    } else {
                        if(UserTemp.removeUserTemp(result.id)) {
                            res.status(200).send(helpers.successFormat({
                                'message': `Congratulation!, Your account has been activated.`
                            }));
                        } else {
                            res.status(400).json(helpers.errorFormat({'message': 'Invalid token. may be sdasdtoken as expired!'}));
                        }
                        next()
                    }
                });
            } else {
                res.status(400).json(helpers.errorFormat({'message': 'Invalid token. may be token as expired!'}));
            }            
        })
        .catch((err) => {
            res.status(500).json(err);
        })
    }
    catch (err) {
        res.status(500).send(helpers.errorFormat({'message': 'invalid token.'}));
    }
}
module.exports = user;
