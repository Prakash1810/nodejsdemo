let helpers = {};

helpers.errorMsgFormat = (error) => {
    return { 
        "code": 400,
        "errors": true,
        "data": { 
            "type": "users",
            "attributes": error
        }
    };
}

helpers.errorFormat = (error) => {
    let errors = {};

    if (error.length) {
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
    } else {
        errors = error;
    }
    return helpers.errorMsgFormat(errors);
}

helpers.successFormat = (res) => {
    return { 
        "code": 200,
        "errors": false,
        "data": { 
            "type": "users",
            "attributes": res
        }
    }; 
}

module.exports = helpers;