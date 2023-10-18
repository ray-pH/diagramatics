import { str_latex_to_unicode } from '../unicode_utils.js';
import { expect } from 'chai';
import 'mocha';

describe('Unicode Utils', () => {
    describe('str_latex_to_unicode', () => {
        it('greeks', () => {
            expect(str_latex_to_unicode('\\alpha')).to.equal('α');
            expect(str_latex_to_unicode('\\beta')).to.equal('β');
            expect(str_latex_to_unicode('\\gamma')).to.equal('γ');
            expect(str_latex_to_unicode('\\alpha\\gamma')).to.equal('αγ');
            expect(str_latex_to_unicode('\\delta')).to.equal('δ');
        });
        it('other symbols', () => {
            expect(str_latex_to_unicode('\\times')).to.equal('×');
            expect(str_latex_to_unicode('\\cdot')).to.equal('⋅');
            expect(str_latex_to_unicode('\\int')).to.equal('∫');
            expect(str_latex_to_unicode('\\sum')).to.equal('∑');
            expect(str_latex_to_unicode('\\int f(x) dx \\in \\mathbb{R}')).to.equal('∫ f(x) dx ∈ ℝ');
        });
    });
});
