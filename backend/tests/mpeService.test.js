import { describe, it, expect } from 'vitest';
import {
  getApplicableMPE,
  evaluateReading,
  evaluateSpread,
  evaluateDiscrimination
} from '../src/services/mpeService.js';

describe('OIML R-76 MPE Calculation & Evaluation Engine', () => {
  describe('1. MPE Resolution (getApplicableMPE)', () => {
    it('resolves Class III INITIAL verification 0-500e worked example (e=2g, load=100g/50e -> MPE=1g)', async () => {
      // 100g / 2g = 50e, which falls into 0-500e range (multiplier = 0.5)
      // MPE = 0.5 * 2g = 1.0g
      const result = await getApplicableMPE({
        accuracyClass: 'III',
        verificationType: 'INITIAL',
        loadValue: 100,
        e: 2
      });

      expect(result.multiplier).toBe(0.5);
      expect(result.mpe).toBe(1.0);
      expect(result.isFallback).toBe(false);
    });

    it('resolves Class III INITIAL verification mid-range 500-2000e (e=2g, load=2000g/1000e -> MPE=2g)', async () => {
      // 2000g / 2g = 1000e -> multiplier = 1.0 -> MPE = 2.0g
      const result = await getApplicableMPE({
        accuracyClass: 'III',
        verificationType: 'INITIAL',
        loadValue: 2000,
        e: 2
      });

      expect(result.multiplier).toBe(1.0);
      expect(result.mpe).toBe(2.0);
      expect(result.isFallback).toBe(false);
    });

    it('resolves Class III INITIAL verification high-range 2000-10000e (e=2g, load=8000g/4000e -> MPE=3g)', async () => {
      // 8000g / 2g = 4000e -> multiplier = 1.5 -> MPE = 3.0g
      const result = await getApplicableMPE({
        accuracyClass: 'III',
        verificationType: 'INITIAL',
        loadValue: 8000,
        e: 2
      });

      expect(result.multiplier).toBe(1.5);
      expect(result.mpe).toBe(3.0);
      expect(result.isFallback).toBe(false);
    });

    it('exercises the IN_SERVICE fallback double-MPE rule (2x initial multiplier)', async () => {
      // When no explicit IN_SERVICE rows exist, initial 0.5e multiplier doubles to 1.0e
      // MPE = 1.0 * 2g = 2.0g
      const result = await getApplicableMPE({
        accuracyClass: 'III',
        verificationType: 'IN_SERVICE',
        loadValue: 100,
        e: 2
      });

      expect(result.multiplier).toBe(1.0);
      expect(result.mpe).toBe(2.0);
      expect(result.isFallback).toBe(true);
    });
  });

  describe('2. Single Point Load Evaluation (evaluateReading)', () => {
    it('evaluates reading exactly at MPE boundary (+1g error for MPE=1g) as PASS', () => {
      const evaluation = evaluateReading({
        standardValue: 100,
        indicatedValue: 101,
        mpe: 1.0
      });

      expect(evaluation.error).toBe(1.0);
      expect(evaluation.result).toBe('PASS');
    });

    it('evaluates reading exactly at negative MPE boundary (-1g error for MPE=1g) as PASS', () => {
      const evaluation = evaluateReading({
        standardValue: 100,
        indicatedValue: 99,
        mpe: 1.0
      });

      expect(evaluation.error).toBe(-1.0);
      expect(evaluation.result).toBe('PASS');
    });

    it('evaluates reading exceeding MPE (1.5g error for MPE=1g) as FAIL', () => {
      const evaluation = evaluateReading({
        standardValue: 100,
        indicatedValue: 101.5,
        mpe: 1.0
      });

      expect(evaluation.error).toBe(1.5);
      expect(evaluation.result).toBe('FAIL');
    });

    it('evaluates reading below negative MPE (-1.5g error for MPE=1g) as FAIL', () => {
      const evaluation = evaluateReading({
        standardValue: 100,
        indicatedValue: 98.5,
        mpe: 1.0
      });

      expect(evaluation.error).toBe(-1.5);
      expect(evaluation.result).toBe('FAIL');
    });

    it('evaluates zero error as PASS', () => {
      const evaluation = evaluateReading({
        standardValue: 500,
        indicatedValue: 500,
        mpe: 1.0
      });

      expect(evaluation.error).toBe(0);
      expect(evaluation.result).toBe('PASS');
    });
  });

  describe('3. Repeatability Spread Evaluation (evaluateSpread)', () => {
    it('evaluates spread exactly equal to MPE as PASS (boundary is inclusive: <= MPE)', () => {
      // Max = 101.0, Min = 100.0, Spread = 1.0, MPE = 1.0 -> PASS
      const evaluation = evaluateSpread({
        indicatedValues: [100.0, 101.0, 100.5],
        mpe: 1.0
      });

      expect(evaluation.spread).toBe(1.0);
      expect(evaluation.result).toBe('PASS');
    });

    it('evaluates spread strictly greater than MPE as FAIL', () => {
      // Max = 101.5, Min = 100.0, Spread = 1.5, MPE = 1.0 -> FAIL
      const evaluation = evaluateSpread({
        indicatedValues: [100.0, 101.5, 100.8],
        mpe: 1.0
      });

      expect(evaluation.spread).toBe(1.5);
      expect(evaluation.result).toBe('FAIL');
    });

    it('throws a validation error if fewer than 3 indicated values are provided', () => {
      expect(() => {
        evaluateSpread({
          indicatedValues: [100.0, 100.5],
          mpe: 1.0
        });
      }).toThrowError(/at least 3 indicated values/);
    });
  });

  describe('4. Discrimination Evaluation (evaluateDiscrimination)', () => {
    it('evaluates discrimination as PASS when displayChanged is true', () => {
      const evaluation = evaluateDiscrimination({ displayChanged: true });
      expect(evaluation.result).toBe('PASS');
    });

    it('evaluates discrimination as FAIL when displayChanged is false', () => {
      const evaluation = evaluateDiscrimination({ displayChanged: false });
      expect(evaluation.result).toBe('FAIL');
    });
  });
});
