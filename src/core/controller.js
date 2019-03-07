class Controller {

    errorMsgFormat (error, type = 'users') {
        return { 
            "code": 400,
            "errors": true,
            "data": { 
                "type": type,
                "attributes": error
            }
        };
    }

    errorFormat (error) {
        let errors = {};
        if (error.details) {
            error.details.forEach((detail) => {
                errors[detail.path] = detail.message;
            });
        } else {
            errors = error;
        }
        return this.errorMsgFormat(errors);
    }

    successFormat ( res, id = null, type = 'users' , code = 200 ) {
        return { 
            "code": code,
            "errors": false,
            "data": {
                "id": id,
                "type": type,
                "attributes": res
            }
        }; 
    }
}

module.exports = Controller;