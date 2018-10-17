const request = require('supertest');
const app     = require('../app');
let data = {
    email: "satz@mail.com",
    password: "123456",

}

describe('POST /api/registraton user registration API', () => {
    describe("Validate the registration process", () => {
        it( 'Validate email , password and confirm password is required' , () => {
            
        })
    
        it('Validate email format', () => {
            
        })
    
        it('Validate pasword match with regx', () => {
            
        })
    
        it('Validate password & confirm password match', () => {
            
        })
    });

    describe("check POST /api/registration route", () => {
        it('check route status is 200', () => {
            return request(app).post('/api/registration')
            .send({name:'satz'})
            .expect(200)
            .then((res) => {
                expect(res.body).toEqual({
                    msg: 'registration posts'
                });
            });
        });
    });
});