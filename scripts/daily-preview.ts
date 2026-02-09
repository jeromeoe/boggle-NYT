#!/usr/bin/env ts-node
/**
 * Daily Board Generator CLI
 * Test and preview daily challenge boards
 * 
 * Usage:
 *   npm run daily-preview              // Preview today's board
 *   npm run daily-preview 2026-02-15   // Preview specific date
 */

import { generateDailyBoard } from '../src/lib/boggle/daily';

async function main() {
    const args = process.argv.slice(2);
    let targetDate = new Date();

    if (args.length > 0) {
        targetDate = new Date(args[0]);
        if (isNaN(targetDate.getTime())) {
            console.error('❌ Invalid date format. Use YYYY-MM-DD');
            process.exit(1);
        }
    }

    console.log('\n🎯 Boggle Daily Board Generator\n');
    console.log('='.repeat(50));

    const result = await generateDailyBoard(targetDate, 100);

    console.log('\n📋 BOARD:');
    console.log('='.repeat(50));
    result.board.forEach(row => {
        console.log('  ' + row.map(cell => cell.padEnd(3)).join(' '));
    });
    console.log('='.repeat(50));

    console.log('\n✅ Board generated successfully!\n');
}

main().catch(console.error);
