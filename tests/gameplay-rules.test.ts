import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../src/lib/boggle/scoring';
import { NEW_BOGGLE_DICE, generateBoardWithSeed } from '../src/lib/boggle/dice';
import { buildTrie } from '../src/lib/boggle/trie';
import { findAllWords } from '../src/lib/boggle/solver';
import { canonicalizeSubmission, SubmissionValidationError } from '../src/lib/boggle/submission';
import { getDailyBoardForDate } from '../src/lib/boggle/daily';
import {
    createSeededChallengeUrl,
    encodeSeededChallenge,
    parseSeededChallenge,
} from '../src/lib/boggle/share';
import {
    getSingaporeDate,
    isCurrentOrPreviousSingaporeDate,
    shiftCalendarDate,
} from '../src/lib/time/singapore';

test('Boggle score tiers match the published 9+ letter rules', () => {
    assert.deepEqual(
        [2, 3, 4, 5, 6, 7, 8, 9, 12].map(length => calculateScore('A'.repeat(length))),
        [0, 1, 1, 2, 3, 5, 7, 11, 11],
    );
});

test('all sixteen Boggle dice have six faces and seeded boards are stable', () => {
    assert.equal(NEW_BOGGLE_DICE.length, 16);
    assert.ok(NEW_BOGGLE_DICE.every(die => die.length === 6));

    const first = generateBoardWithSeed(20260720);
    const second = generateBoardWithSeed(20260720);
    assert.deepEqual(first, second);
    assert.equal(first.flat().length, 16);
    assert.ok(first.flat().every(tile => /^[A-Z]$|^QU$/.test(tile)));
});

test('a Qu tile always contributes both letters', () => {
    const board = [
        ['QU', 'A', 'T', 'X'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X'],
    ];
    const words = findAllWords(board, buildTrie(['QUA', 'QUAT', 'QAT']));

    assert.equal(words.has('QUA'), true);
    assert.equal(words.has('QUAT'), true);
    assert.equal(words.has('QAT'), false);
});

test('server canonicalization recomputes score and rejects tampering', () => {
    const possible = new Set(['CAT', 'QUAT', 'ABCDEFGHI']);
    const result = canonicalizeSubmission(possible, [' cat ', 'ABCDEFGHI'], ['DOG']);

    assert.deepEqual(result.wordsFound, ['CAT', 'ABCDEFGHI']);
    assert.deepEqual(result.wordsPenalized, ['DOG']);
    assert.deepEqual(
        { gross: result.grossScore, penalty: result.penaltyScore, net: result.netScore },
        { gross: 12, penalty: -1, net: 11 },
    );
    assert.throws(
        () => canonicalizeSubmission(possible, ['FABRICATED'], []),
        SubmissionValidationError,
    );
    assert.throws(
        () => canonicalizeSubmission(possible, ['CAT', 'cat'], []),
        SubmissionValidationError,
    );
    assert.throws(
        () => canonicalizeSubmission(possible, [], ['QUAT']),
        SubmissionValidationError,
    );
});

test('Daily Challenge uses the Singapore calendar boundary', () => {
    const beforeMidnight = new Date('2026-07-20T15:59:59.999Z');
    const atMidnight = new Date('2026-07-20T16:00:00.000Z');

    assert.equal(getSingaporeDate(beforeMidnight), '2026-07-20');
    assert.equal(getSingaporeDate(atMidnight), '2026-07-21');
    assert.equal(shiftCalendarDate('2026-03-01', -1), '2026-02-28');
    assert.equal(isCurrentOrPreviousSingaporeDate('2026-07-20', atMidnight), true);
    assert.equal(isCurrentOrPreviousSingaporeDate('2026-07-19', atMidnight), false);
});

test('daily boards are deterministic by challenge date', () => {
    assert.deepEqual(getDailyBoardForDate('2026-07-20'), getDailyBoardForDate('2026-07-20'));
    assert.notDeepEqual(
        getDailyBoardForDate('2026-07-20').board,
        getDailyBoardForDate('2026-07-21').board,
    );
});

test('seeded challenge links round-trip without exposing mutable board data', () => {
    const challenge = { seed: 0xFFFFFFFF, mode: 'rapid' as const };
    const token = encodeSeededChallenge(challenge);

    assert.equal(token, 'v1.rapid.1z141z3');
    assert.deepEqual(parseSeededChallenge(token), challenge);
    assert.equal(
        createSeededChallengeUrl('https://moggle.example', challenge),
        'https://moggle.example/play?challenge=v1.rapid.1z141z3',
    );
});

test('malformed and unsupported challenge tokens are rejected', () => {
    assert.equal(parseSeededChallenge('v1.rapid.-1'), null);
    assert.equal(parseSeededChallenge('v1.daily.abc'), null);
    assert.equal(parseSeededChallenge('v2.rapid.abc'), null);
    assert.equal(parseSeededChallenge('v1.rapid.1z141z4'), null);
    assert.equal(parseSeededChallenge('v1.rapid.abc.extra'), null);
});
