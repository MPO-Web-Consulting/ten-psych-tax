const session = require("express-session");

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // express-session's own default cookie maxAge

// express-session's built-in MemoryStore never expires or evicts entries --
// every login grows it and nothing ever shrinks it until the process
// restarts, which is exactly the "MemoryStore is not designed for a
// production environment... it will leak memory" warning it logs on boot.
// This backs sessions with the same sqlite file the app already uses, so
// entries persist across restarts and expired ones can actually be pruned.
class SqliteSessionStore extends session.Store {
    constructor(db) {
        super();
        this.db = db;
        this.statements = {
            get: db.prepare("SELECT data, expires_at FROM sessions WHERE sid = ?"),
            upsert: db.prepare(`
                INSERT INTO sessions (sid, data, expires_at) VALUES (@sid, @data, @expiresAt)
                ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
            `),
            destroy: db.prepare("DELETE FROM sessions WHERE sid = ?"),
            touch: db.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?"),
            prune: db.prepare("DELETE FROM sessions WHERE expires_at <= ?")
        };
    }

    static expiryFor(sessionData) {
        const maxAge = sessionData.cookie && sessionData.cookie.maxAge;
        return Date.now() + (typeof maxAge === "number" ? maxAge : DEFAULT_MAX_AGE_MS);
    }

    get(sid, callback) {
        try {
            const row = this.statements.get.get(sid);
            if (!row || row.expires_at <= Date.now()) return callback(null, null);
            callback(null, JSON.parse(row.data));
        } catch (err) {
            callback(err);
        }
    }

    set(sid, sessionData, callback) {
        try {
            this.statements.upsert.run({
                sid,
                data: JSON.stringify(sessionData),
                expiresAt: SqliteSessionStore.expiryFor(sessionData)
            });
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    destroy(sid, callback) {
        try {
            this.statements.destroy.run(sid);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    touch(sid, sessionData, callback) {
        try {
            this.statements.touch.run(SqliteSessionStore.expiryFor(sessionData), sid);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    prune() {
        this.statements.prune.run(Date.now());
    }
}

module.exports = SqliteSessionStore;
