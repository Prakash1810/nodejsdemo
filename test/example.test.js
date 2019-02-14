const example = require('../src/core/example');


describe('add', () => {
    it('should add two positive numbers correctly', () => {
        let result = example.add(10, 20);
        expect(result).toBe(30);
    });
    
    
    it('should add two positive decimal numbers correctly', () => {
        let result = example.add(.5, .2);
        expect(result).toBeCloseTo(.7);
    });
    
    it('should add two negetive numbers correctly', () => {
        let result = example.add(-5, -2);
        expect(result).toBe(-7);
    });
})


describe('substract', () => {
    it('should substract two positive numbers correctly', () => {
        let result = example.substract(10, 20);
        expect(result).toBe(-10);
    });
    
    
    it('should substract two positive decimal numbers correctly', () => {
        let result = example.substract(.5, .2);
        expect(result).toBeCloseTo(.3);
    });
    
    it('should substract two negetive numbers correctly', () => {
        let result = example.substract(-5, -2);
        expect(result).toBeCloseTo(-3);
    });
})
