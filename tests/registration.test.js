const request = require('supertest');
const app     = require('../app');

let requestRegistration =  request(app).post('/api/registration').set('Accept', 'application/json').set('Accept', 'application/json');

describe('POST /api/registraton user registration API', () => {
    describe("Validate the registration process", () => {
        it( 'Validate email , password and confirm password is required' , () => {
            return requestRegistration
                    .send({
                        email: "",
                        password: "",
                        password_conirmation: "",
                        refferal_code: null
                    })
                    .expect(400)
                    .then((res) => {
                        expect(res.body).toMatchObject({
                            data: {
                                attributes: {
                                    email: 'Invalid email address.',
                                    password: 'password must be at least 8 characters with uppercase letters and numbers.',
                                    password_confirmation: '\"password confirmation\" is required'
                                }
                            }
                        });
                    });
        })
    
        it('Validate email format', () => {
            return requestRegistration
                .send({
                    email: "satzmail.com",
                    password: "123456",
                    password_conirmation: "123456",
                    refferal_code: null
                })
                .expect(400)
                .then((res) => {
                    expect(res.body).toEqual({
                        msg: 'registration posts'
                    });
                });
        })
    
        it('Validate pasword match with regx', () => {
            
        })
    
        it('Validate password & confirm password match', () => {
            
        })
    });

    describe("check POST /api/registration route", () => {
        it('check route status is 200', () => {
            return requestRegistration
                    .expect(200)
                    .then((res) => {
                        expect(res.body).toEqual({
                            msg: 'registration posts'
                        });
                    });
        });
    });
});