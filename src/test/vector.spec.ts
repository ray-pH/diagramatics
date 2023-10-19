import { Vector2, V2, Vdir } from '../vector.js';
import { expect } from 'chai';
import 'mocha';

describe('Vector2', () => {
    it('Vdir', () => {
        let v = Vdir(Math.PI/2);
        let vexp = V2(0,1);
        expect(v.x).to.closeTo(vexp.x, 0.0001);
        expect(v.y).to.closeTo(vexp.y, 0.0001);
    });
    describe('Methods', () => {
        let va = V2(1,2);
        let vb = V2(3,4);

        it('addition'       , () => { expect(va.add(vb)).to.eql(V2(4,6)); });
        it('subtraction'    , () => { expect(va.sub(vb)).to.eql(V2(-2,-2)); });
        it('scaling'        , () => { expect(va.scale(2)).to.eql(V2(2,4)); });
        it('multiplication' , () => { expect(va.mul(vb)).to.eql(V2(3,8)); });
        it('rotation'       , () => { 
            let vc = va.rotate(Math.PI/2);
            let vexp = V2(-2,1);
            expect(vc.x).to.closeTo(vexp.x, 0.0001);
            expect(vc.y).to.closeTo(vexp.y, 0.0001);
        });
        it('dot product'    , () => { expect(va.dot(vb)).to.equal(11); });
        it('cross product'  , () => { expect(va.cross(vb)).to.equal(-2); });
        it('length'         , () => { expect(va.length()).to.closeTo(Math.sqrt(5), 0.0001); });
        it('length_sq'      , () => { expect(va.length_sq()).to.equal(5); });
        it('angle'          , () => { expect(va.angle()).to.closeTo(Math.atan2(2,1), 0.0001); });
        it('normalization'  , () => { expect(va.normalize()).to.eql(V2(1/Math.sqrt(5), 2/Math.sqrt(5))); });
        it('equality'       , () => { expect(va.equals(vb)).to.be.false; });
        it('apply'       , () => { 
            let f = (v : Vector2) => v.add(V2(1,1));
            expect(va.apply(f)).to.eql(V2(2,3));
        });
    });
});

