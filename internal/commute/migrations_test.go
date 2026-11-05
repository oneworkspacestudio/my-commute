package commute

import (
	"database/sql"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"testing"
)

func TestMigrationsResumeWithoutReapplyingOlderVersions(t *testing.T) {
	for _, existing := range []int{0, 1, 2, 3} {
		t.Run(string(rune('0'+existing)), func(t *testing.T) {
			db, e := sql.Open("sqlite", ":memory:")
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			db.SetMaxOpenConns(1)
			if _, e = db.Exec(`CREATE TABLE host_migrations(version INTEGER PRIMARY KEY,at TEXT);CREATE TABLE host_users(id TEXT PRIMARY KEY);`); e != nil {
				t.Fatal(e)
			}
			h := &apphost.Host{DB: db}
			if existing > 0 {
				if e = h.Migrate(1, `CREATE TABLE commute_state(user_id TEXT PRIMARY KEY,body TEXT NOT NULL);`); e != nil {
					t.Fatal(e)
				}
			}
			if existing >= 2 {
				if e = migrate(h); e != nil {
					t.Fatal(e)
				}
			}
			if existing == 3 {
				if e = h.Migrate(3, `SELECT 1;`); e != nil {
					t.Fatal(e)
				}
				if migrate(h) == nil {
					t.Fatal("future schema accepted")
				}
				return
			}
			if e = migrate(h); e != nil {
				t.Fatal(e)
			}
			if _, e = db.Exec(`INSERT INTO host_users VALUES('synthetic-user');INSERT INTO commute_state VALUES('synthetic-user','saved synthetic journey');`); e != nil {
				t.Fatal(e)
			}
			if e = migrate(h); e != nil {
				t.Fatal("restart rejected its own schema", e)
			}
			var saved string
			if e = db.QueryRow("SELECT body FROM commute_state").Scan(&saved); e != nil || saved != "saved synthetic journey" {
				t.Fatal("saved journey lost", e)
			}
			if _, e = db.Exec("SELECT rail_token FROM commute_providers"); e != nil {
				t.Fatal(e)
			}
		})
	}
}
