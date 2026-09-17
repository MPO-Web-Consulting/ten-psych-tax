const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The stored extension and mimetype come from these signatures, never from
// the client-supplied Content-Type header or the original filename — both
// are attacker controlled and were previously trusted as-is.
const SIGNATURES = [
    { mimetype: "application/pdf", ext: ".pdf", magic: Buffer.from("25504446", "hex") },
    { mimetype: "image/png", ext: ".png", magic: Buffer.from("89504e470d0a1a0a", "hex") },
    { mimetype: "image/jpeg", ext: ".jpg", magic: Buffer.from("ffd8ff", "hex") },
    { mimetype: "image/webp", ext: ".webp", magic: Buffer.from("52494646", "hex"), riffWebp: true }
];

function detectFileType(buffer) {
    for (const sig of SIGNATURES) {
        if (buffer.length < sig.magic.length) continue;
        if (!buffer.subarray(0, sig.magic.length).equals(sig.magic)) continue;
        if (sig.riffWebp && (buffer.length < 12 || buffer.subarray(8, 12).toString("ascii") !== "WEBP")) continue;
        return sig;
    }
    return null;
}

class VerifiedDiskStorage {
    _handleFile(req, file, cb) {
        const chunks = [];
        file.stream.on("data", (chunk) => chunks.push(chunk));
        file.stream.on("error", cb);
        file.stream.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const detected = detectFileType(buffer);
            if (!detected) {
                return cb(new Error("Unrecognized or unsupported file content"));
            }
            const filename = `${crypto.randomUUID()}${detected.ext}`;
            const destination = path.join(UPLOAD_DIR, filename);
            fs.writeFile(destination, buffer, (err) => {
                if (err) return cb(err);
                cb(null, {
                    destination: UPLOAD_DIR,
                    filename,
                    path: destination,
                    size: buffer.length,
                    mimetype: detected.mimetype
                });
            });
        });
    }

    _removeFile(req, file, cb) {
        // Multer calls this to clean up after ANY error in the request (not
        // just ones from this file) -- including a file _handleFile rejected
        // before ever writing it, which never got a `path` assigned. Passing
        // that undefined straight to fs.unlink throws synchronously and
        // uncaught, crashing the whole process, not just the request.
        if (!file.path) return cb(null);
        fs.unlink(file.path, (err) => cb(err && err.code !== "ENOENT" ? err : null));
    }
}

const ALLOWED_MIME_TYPES = new Set(SIGNATURES.map((sig) => sig.mimetype));

const upload = multer({
    storage: new VerifiedDiskStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
        cb(null, true);
    }
});

function deleteUploadedFile(filename) {
    if (!filename) return;
    try {
        fs.unlinkSync(path.join(UPLOAD_DIR, filename));
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error(`Failed to delete uploaded file ${filename}:`, err);
        }
    }
}

module.exports = { upload, UPLOAD_DIR, deleteUploadedFile };
