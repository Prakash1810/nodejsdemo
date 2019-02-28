'use strict';

const { expect }    = require('chai');
const user          = require('../../src/core/user');
var isValidRequest  = {
                        'email' : 'satz@mail.com',
                        'password'  : '1234567S',
                    };

describe('User module unit test case :-', () => {
    it ('should check all the fields are required', () => {
        var errors    = {};
        let { error } = user.validate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("\"email\" is required");
        expect(errors.password).to.equal("\"password\" is required");
    });

    it ('should be validate email format', () => {
        var errors    = {};
        isValidRequest.password = '123456';
        isValidRequest.email = 'satz@gmail';
        let { error } = user.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("Invalid email address.");
    });

    it ('should check all the fields are entered', () => {
        isValidRequest.password = '1234567S';
        isValidRequest.email = 'satz@gmail.com';
        let { error } = user.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
    });
});
