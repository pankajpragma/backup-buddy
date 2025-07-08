import * as path from 'path';
import * as fs from 'fs';

// Import Mocha properly
const Mocha = require('mocha');

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    try {
        // Find test files manually
        const files = await findTestFiles(testsRoot);
        
        // Add files to the test suite
        files.forEach((f: string) => mocha.addFile(f));

        // Run the mocha test
        return new Promise<void>((resolve, reject) => {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function findTestFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function searchDir(currentDir: string): Promise<void> {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                await searchDir(fullPath);
            } else if (entry.name.endsWith('.test.js')) {
                files.push(fullPath);
            }
        }
    }
    
    await searchDir(dir);
    return files;
}