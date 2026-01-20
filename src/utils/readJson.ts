import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
export async function getJsonData(fileName:any,folderName:any) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const absolute_base_url = join(__dirname, "..", "..");
        const filePath = join(absolute_base_url,`languages/${folderName}`, `${fileName}.json`); 
        const data = await fs.readFile(filePath, "utf-8"); // no callback here
        const json = JSON.parse(data);
        return json;
    } catch (err) {
        throw err;
    }
}