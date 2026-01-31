// @ts-ignore
// const { stringify } = require('csv-stringify/sync');
import * as fs from 'fs';
import * as path from 'path';

function stringify(data: any[], options: { header: boolean, columns: string[] }): string {
    const header = options.columns.join(',') + '\n';
    const rows = data.map(row => {
        return options.columns.map(col => {
            const val = row[col];
            // Handle quotes/commas if needed, simplified for now
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return text(val);
        }).join(',');
    }).join('\n');
    return header + rows;
}

function text(val: any): string {
    return val === undefined || val === null ? '' : String(val);
}

export class CsvWriter {
    private outputDir: string;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    public write(filename: string, data: any[], columns: string[]) {
        const output = stringify(data, { header: true, columns: columns });
        const filePath = path.join(this.outputDir, filename);
        fs.writeFileSync(filePath, output);
        console.log(`Wrote ${filePath}`);
    }
}
