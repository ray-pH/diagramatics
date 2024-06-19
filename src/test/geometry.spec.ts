import { area } from '../shapes/shapes_geometry.js'
import { circle, square } from '../index.js'
import { expect } from 'chai';
import 'mocha';

describe('Geometry', () => {
    describe('Area', () => {
        it('simple shapes', () => {
            expect(area(square(1))).to.equal(1);
            expect(area(circle(1))).to.be.closeTo(Math.PI, 0.01);
        });
    });

});
