import { linspace, linspace_exc, range, range_inc, array_repeat, transpose } from '../utils.js';
import { expect } from 'chai';
import 'mocha';

describe('Utils', () => {
    describe('linspace', () => {
        it('linspace', () => {
            expect(linspace(0,1,5)).to.eql([0, 0.25, 0.5, 0.75, 1]);
            expect(linspace(0,1,4)).to.eql([0, 0.3333333333333333, 0.6666666666666666, 1]);
        });
        it('linspace_exc', () => {
            expect(linspace_exc(0,1,5)).to.eql([0, 0.2, 0.4, 0.6000000000000001, 0.8]);
            expect(linspace_exc(0,1,4)).to.eql([0, 0.25, 0.5, 0.75]);
        });
    });

    describe('range', () => {
        it('range', () => {
            expect(range(0, 5)).to.eql([0, 1, 2, 3, 4]);
            expect(range(0, 5, 1)).to.eql([0, 1, 2, 3, 4]);
            expect(range(0, 5, 2)).to.eql([0, 2, 4]);
            expect(range(0, 5, 0.5)).to.eql([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
        });
        it('range_inc', () => {
            expect(range_inc(0, 5)).to.eql([0, 1, 2, 3, 4, 5]);
            expect(range_inc(0, 5, 1)).to.eql([0, 1, 2, 3, 4, 5]);
            expect(range_inc(0, 5, 2)).to.eql([0, 2, 4]);
            expect(range_inc(0, 5, 0.5)).to.eql([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
        });
    });

    describe('transpose', () => {
        it('rect', () => {
            expect(transpose([[1,2],[3,4]])).to.eql([[1,3],[2,4]]);
            expect(transpose([[1,2,3],[4,5,6],[7,8,9]])).to.eql([[1,4,7],[2,5,8],[3,6,9]]);
            expect(transpose([[1,2,3,4],[5,6,7,8]])).to.eql([[1,5],[2,6],[3,7],[4,8]]);
        });
        it('non_rect', () => {
            expect(transpose([[1,2,3],[4,5]])).to.eql([[1,4],[2,5],[3,undefined]]);
            expect(transpose([[1,2,3],[4,5,6],[7,8]])).to.eql([[1,4,7],[2,5,8],[3,6,undefined]]);
            expect(transpose([[1,2],[3,4,5],[6,7,8]])).to.eql([[1,3,6],[2,4,7],[undefined, 5,8]]);
        });
    });
});

