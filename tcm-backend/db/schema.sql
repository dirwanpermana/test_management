-- ============================================================
-- TCM (Test Case Management) — schema.sql
-- Diadaptasi dari rancangan-tcm-system.md (§3). Jalankan sekali
-- di database kosong (lihat README untuk cara pakai).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Master ----------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL UNIQUE,
    name        VARCHAR(50) NOT NULL
);

INSERT INTO roles (code, name) VALUES
    ('QA','Quality Assurance'), ('DEV','Developer')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    role_id       INT NOT NULL REFERENCES roles(id),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ---------- Test Case Header ----------
CREATE TABLE IF NOT EXISTS test_case_headers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    header_code     CHAR(6) NOT NULL,
    nama_test_case  VARCHAR(255) NOT NULL,
    jira_url        VARCHAR(500),
    nama_menu       VARCHAR(255) NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_set_header_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.header_code := to_char(now(), 'YYMMDD');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_header_code ON test_case_headers;
CREATE TRIGGER trg_set_header_code
BEFORE INSERT ON test_case_headers
FOR EACH ROW EXECUTE FUNCTION fn_set_header_code();

-- ---------- Test Case Items (numbering global per hari, lihat asumsi A1) ----------
CREATE TABLE IF NOT EXISTS test_case_daily_counter (
    counter_date DATE PRIMARY KEY,
    last_seq     INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_case_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    header_id        UUID NOT NULL REFERENCES test_case_headers(id) ON DELETE CASCADE,
    case_no          VARCHAR(9) UNIQUE,
    seq_no           INT NOT NULL,
    feature_name     VARCHAR(255) NOT NULL,
    test_type        VARCHAR(10) NOT NULL CHECK (test_type IN ('Positive','Negative')),
    scenario         TEXT NOT NULL,
    steps            TEXT NOT NULL,
    test_data        TEXT,
    expected_result  TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'Not Executed'
                       CHECK (status IN ('Not Executed','Pass','Fail','Blocked','On Hold')),
    pic_qa           UUID NOT NULL REFERENCES users(id),
    test_date        DATE,
    note             TEXT,
    pic_dev          UUID REFERENCES users(id),
    dev_area         CHAR(2) CHECK (dev_area IN ('FE','BE')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tci_header ON test_case_items(header_id);
CREATE INDEX IF NOT EXISTS idx_tci_status ON test_case_items(status);
CREATE INDEX IF NOT EXISTS idx_tci_pic_qa ON test_case_items(pic_qa);

CREATE OR REPLACE FUNCTION fn_before_insert_test_case_item()
RETURNS TRIGGER AS $$
DECLARE
    v_seq    INT;
    v_header CHAR(6);
BEGIN
    INSERT INTO test_case_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = test_case_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    SELECT header_code INTO v_header FROM test_case_headers WHERE id = NEW.header_id;

    NEW.seq_no  := v_seq;
    NEW.case_no := v_header || '-' || lpad(v_seq::text, 2, '0');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_test_case_item_seq ON test_case_items;
CREATE TRIGGER trg_test_case_item_seq
BEFORE INSERT ON test_case_items
FOR EACH ROW EXECUTE FUNCTION fn_before_insert_test_case_item();

-- ---------- Bugs ----------
CREATE TABLE IF NOT EXISTS bug_daily_counter (
    counter_date DATE PRIMARY KEY,
    last_seq     INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bugs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_no              VARCHAR(14) UNIQUE,
    test_case_item_id   UUID REFERENCES test_case_items(id),
    reporter_id         UUID NOT NULL REFERENCES users(id),
    scenario            TEXT NOT NULL,
    steps_to_reproduce  TEXT NOT NULL,
    expected_result     TEXT NOT NULL,
    actual_result       TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Open'
                          CHECK (status IN ('Open','Ready to Test','Reopen','Closed','Rejected')),
    assigned_to         UUID REFERENCES users(id),
    updated_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned ON bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_test_case ON bugs(test_case_item_id);

CREATE OR REPLACE FUNCTION fn_before_insert_bug()
RETURNS TRIGGER AS $$
DECLARE
    v_seq INT;
BEGIN
    INSERT INTO bug_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = bug_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    NEW.bug_no := 'BUG-' || to_char(now(),'YYMMDD') || '-' || lpad(v_seq::text,2,'0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bug_no ON bugs;
CREATE TRIGGER trg_bug_no
BEFORE INSERT ON bugs
FOR EACH ROW EXECUTE FUNCTION fn_before_insert_bug();

CREATE TABLE IF NOT EXISTS bug_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id      UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    comment     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bug_status_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id       UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    changed_by   UUID NOT NULL REFERENCES users(id),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_log_bug_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        INSERT INTO bug_status_history (bug_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, NEW.reporter_id));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bug_status_log ON bugs;
CREATE TRIGGER trg_bug_status_log
BEFORE UPDATE ON bugs
FOR EACH ROW EXECUTE FUNCTION fn_log_bug_status_change();

-- Trigger create: catat status 'Open' awal ke history juga
CREATE OR REPLACE FUNCTION fn_log_bug_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bug_status_history (bug_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.reporter_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bug_created_log ON bugs;
CREATE TRIGGER trg_bug_created_log
AFTER INSERT ON bugs
FOR EACH ROW EXECUTE FUNCTION fn_log_bug_created();

-- Role-aware status transition rule (§3.5)
CREATE TABLE IF NOT EXISTS bug_status_transitions (
    from_status  VARCHAR(20) NOT NULL,
    to_status    VARCHAR(20) NOT NULL,
    allowed_role VARCHAR(10) NOT NULL,
    PRIMARY KEY (from_status, to_status, allowed_role)
);

INSERT INTO bug_status_transitions (from_status, to_status, allowed_role) VALUES
    ('Open', 'Ready to Test', 'DEV'),
    ('Ready to Test', 'Reopen', 'QA'),
    ('Ready to Test', 'Closed', 'QA'),
    ('Reopen', 'Ready to Test', 'DEV'),
    ('Open', 'Rejected', 'QA')
ON CONFLICT DO NOTHING;

-- ---------- Attachments (generic) ----------
CREATE TABLE IF NOT EXISTS attachments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachable_type  VARCHAR(20) NOT NULL CHECK (attachable_type IN ('test_case_item','bug')),
    attachable_id    UUID NOT NULL,
    file_url         VARCHAR(500) NOT NULL,
    file_name        VARCHAR(255) NOT NULL,
    uploaded_by      UUID NOT NULL REFERENCES users(id),
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(attachable_type, attachable_id);

-- ---------- Monitoring views ----------
CREATE OR REPLACE VIEW v_test_case_monitoring AS
SELECT
    h.id                                            AS header_id,
    h.header_code,
    h.nama_test_case,
    COUNT(i.id)::int                                AS total_case,
    COUNT(i.id) FILTER (WHERE i.status IN ('Pass','Fail','Blocked'))::int AS executed_case,
    (ROUND(
        100.0 * COUNT(i.id) FILTER (WHERE i.status IN ('Pass','Fail','Blocked'))
        / NULLIF(COUNT(i.id), 0), 2
    ))::float8                                       AS percentage,
    CASE
        WHEN COUNT(i.id) FILTER (WHERE i.status = 'On Hold') > 0 THEN 'Hold'
        WHEN COUNT(i.id) FILTER (WHERE i.status IN ('Pass','Fail','Blocked')) = COUNT(i.id)
             AND COUNT(i.id) > 0 THEN 'Complete'
        ELSE 'On Progress'
    END                                              AS category,
    string_agg(DISTINCT u.full_name, ', ')           AS pic_qa_names
FROM test_case_headers h
LEFT JOIN test_case_items i ON i.header_id = h.id
LEFT JOIN users u ON u.id = i.pic_qa
GROUP BY h.id, h.header_code, h.nama_test_case;

CREATE OR REPLACE VIEW v_bug_monitoring AS
SELECT
    b.status,
    dev.full_name    AS assigned_to_name,
    COUNT(*)::int    AS total_bug
FROM bugs b
LEFT JOIN users dev ON dev.id = b.assigned_to
GROUP BY b.status, dev.full_name;
