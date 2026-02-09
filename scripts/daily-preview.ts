#!/usr/bin/env ts-node
/**
 * Daily Board Generator CLI
 * Test and preview daily challenge boards
 * 
 * Usage:
 *   npm run daily-preview              // Preview today's board
 *   npm run daily-preview 2026-02-15   // Preview specific date
 */

import { getTodaysDailyBoard } from '../src/lib/boggle/daily';

async function main() {
    console.log('\n🎯 Boggle Daily Board Generator\n');
    console.log('='.repeat(50));

    const result = await getTodaysDailyBoard();

    console.log('\n📅 Date:', result.date);
    console.log('🎲 Seed:', result.seed);
    console.log('\n📋 BOARD:');
    console.log('='.repeat(50));
    result.board.forEach(row => {
        console.log('  ' + row.map(cell => cell.padEnd(3)).join(' '));
    });
    console.log('='.repeat(50));

    console.log('\n✅ Board generated successfully!\n');
}

main().catch(console.error);
