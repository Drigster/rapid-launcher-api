import { join, relative } from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";

const publicDir = join(process.cwd(), "public");
const outFile = join(process.cwd(), "public/public-hashes.json");

async function getFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await getFiles(fullPath)));
		} else if (entry.isFile()) {
			if (
				entry.name === "public-hashes.json" ||
				entry.name === "Rapid Launcher Files.zip"
			) {
				continue;
			}
			files.push(fullPath);
		}
	}

	return files;
}

async function hashFile(filePath: string) {
	const hash = createHash("sha256");
	const input = createReadStream(filePath);
	await pipeline(input, hash);
	return hash.digest("hex");
}

async function main() {
	try {
		const files = await getFiles(publicDir);
		const hashes: Record<string, string> = {};

		for (const filePath of files) {
			const hash = await hashFile(filePath);
			const relativePath = relative(publicDir, filePath).replace(/\\/g, "/");
			hashes[relativePath] = hash;
		}

		const output = {
			count: Object.keys(hashes).length,
			files: hashes,
		};

		await writeFile(outFile, JSON.stringify(output, null, 2), "utf8");
		console.log(`Generated ${output.count} SHA-256 hashes to ${outFile}`);
	} catch (error) {
		console.error("Failed to generate hashes:", error);
		process.exit(1);
	}
}

main();
