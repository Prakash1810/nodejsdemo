const request = require('supertest');
const app     = require('../app');
let data = {
    email: "satzmail.com",
    password: "123456",
    password_conirmation: "123456",
    refferal_code: null
};

let requestRegistration =  request(app).post('/api/registration').set('Accept', 'application/json').set('Accept', 'application/json');

describe('POST /api/registraton user registration API', () => {
    describe("Validate the registration process", () => {
        it( 'Validate email , password and confirm password is required' , () => {
            return requestRegistration
                    .send(data)
                    .expect(400)
                    .then((res) => {
                        expect(res.body).toEqual({
                            msg: 'registration posts'
                        });
                    })
                    .end(function(err, res) {
                        if (err) throw err;
                    });
        })
    
        it('Validate email format', () => {
            return requestRegistration
                .send(data)
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