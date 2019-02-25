const { expect }    = require('chai');
const registration  = require('../src/core/registration');
const request       = require('supertest');
const UserTemp      = require('../src/db/user-temp');
const config        = require('config');
const baseUrl       = config.get('site_info.url');
const route         = '/api/registration';
var isValidRequest  = {
                        'email' : 'satz@mail.com',
                        'password'  : '1234567S',
                        'password_confirmation' : '1234567S'
                    };
var errors          = {};

after((done) => {
    UserTemp.deleteOne({ email: 'satz@mail.com' } 
                        , function (err) {
                            expect(err).to.equal(null);
                            done();
                        });
});

describe('Registration module unit test case :-', () => {
    it ('should check all the fields are required', (done) => {
        let { error } = registration.validate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("\"email\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.password_confirmation).to.equal("\"password confirmation\" is required");
        done()
    });

    it ('should match the password and confirm password', (done) => {
        isValidRequest.password  = '1234567SS';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password_confirmation).to.equal("\"password confirmation\" must match password");
        done()
    });

    it ('should match the password strength', (done) => {
        isValidRequest.password = '123456';
        isValidRequest.password_confirmation = '123456';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should be validate email format', (done) => {
        isValidRequest.password = '123456';
        isValidRequest.password_confirmation = '123456';
        isValidRequest.email = 'satz@gmail';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should check all the fields are entered', (done) => {
        isValidRequest.password = '1234567S';
        isValidRequest.password_confirmation = '1234567S';
        isValidRequest.email = 'satz@gmail.com';
        let { error } = registration.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
        done()
    });
});

describe('Registration module intergration test case:- /api/registraton', () => {
    it( 'Validate email , password and confirm password is required' , (done) => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("\"email\" is required");
            expect(res.body.data.attributes.password).to.equal("\"password\" is required");
            expect(res.body.data.attributes.password_confirmation).to.equal("\"password confirmation\" is required");
            done()
        });
    });

    it('Validate email format', (done) => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satzmail.com",
            password: "1234567S",
            password_confirmation: "1234567S",
            refferal_code: null
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("Invalid email address.");
            done()
        });
    });

    it('Validate pasword match with regx', (done) => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
            done()
        });
    });

    it('Validate password & confirm password match', (done) => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password_confirmation).to.equal("\"password confirmation\" must match password");
            done()
        });
    });

    it('Successfully user registred', (done) => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(200)
        .then((res) => {
            expect(res.body.data.id).to.equal(false);
            expect(res.body.data.type).to.equal("users");
            expect(res.body.data.attributes.message).to.equal("We have sent a confirmation email to your registered email address. satz@mail.com. Please follow the instructions in the email to continue.");
            done()
        });
    });

    it('Validate email address already registred', (done) => {
        request(baseUrl)
        .post('/api/registration')
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("This email address already exits.");
            done()
        });
    });
});