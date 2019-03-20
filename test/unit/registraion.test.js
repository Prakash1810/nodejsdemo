'use strict';

const { expect }    = require('chai');
const registration  = require('../../src/core/registration');
var isValidRequest  = {
                        'email' : 'satz@mail.com',
                        'password'  : '1234567S',
                        'password_confirmation' : '1234567S'
                    };

describe('Registration module unit test case :-', () => {
    it ('should check all the fields are required', () => {
        var errors    = {};
        let { error } = registration.validate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("\"email\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.password_confirmation).to.equal("\"password confirmation\" is required");
    });

    it ('should match the password and confirm password', () => {
        var errors    = {};
        isValidRequest.password  = '1234567SS';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password_confirmation).to.equal("\"password confirmation\" must match password");
    });

    it ('should check password strength', () => {
        var errors    = {};
        isValidRequest.password = '123456';
        isValidRequest.password_confirmation = '123456';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
    });

    it ('should be validate email format', () => {
        var errors    = {};
        isValidRequest.password = '1234567S';
        isValidRequest.password_confirmation = '1234567S';
        isValidRequest.email = 'satz@gmail';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("Invalid email address.");
    });

    it ('should check all the fields are entered', () => {
        isValidRequest.password = '1234567S';
        isValidRequest.password_confirmation = '1234567S';
        isValidRequest.email = 'satz@gmail.com';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
    });
});