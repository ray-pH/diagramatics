import { get_tick_numbers } from '../shapes/shapes_graph.js'
import { expect } from 'chai';
import 'mocha';

describe('Graph', () => {
    describe('axes', () => {
        it('get_tick_numbers', () => {
            expect(get_tick_numbers(0, 0.1)).to.eql([0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1]);
            expect(get_tick_numbers(0, 1)).to.eql([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
            expect(get_tick_numbers(0, 10)).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            expect(get_tick_numbers(0, 100)).to.eql([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
            expect(get_tick_numbers(0, 5)).to.eql([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
            expect(get_tick_numbers(0, 15)).to.eql([ 0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15 ]);
        });
    });

});

